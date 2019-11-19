import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { DependencyFactoryFactory, Device, Location, LocationUserRole, LookupItem, PropExpand, SystemMode } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import LocationTable from '../location/LocationTable';
import { NotificationService, NotificationServiceFactory } from '../notification/NotificationService';
import { AccountResolver, DeviceResolver, PropertyResolverMap, Resolver, SubscriptionResolver, UserResolver } from '../resolver';
import { LookupService } from '../service';
import { UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import UserLocationRoleTable from '../user/UserLocationRoleTable';
import { LocationRecord, LocationRecordData } from './LocationRecord';
import moment from 'moment';

const DEFAULT_LANG = 'en';
const DEFAULT_AREAS_ID = 'areas.default';

@injectable()
class LocationResolver extends Resolver<Location> {
  protected propertyResolverMap: PropertyResolverMap<Location> = {
    devices: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {
      const devices = await this.deviceResolverFactory().getAllByLocationId(location.id, expandProps);

      return devices.map(device => {

        if (!shouldExpand) {
          return {
            id: device.id,
            macAddress: device.macAddress
          };
        }

        return device;
      });
    },
    users: async (location: Location, shouldExpand = false) => {
      const locationUserRoles = await this.getAllUserRolesByLocationId(location.id);

      if (shouldExpand) {
        return Promise.all(
          locationUserRoles.map(async (locationUserRole) => {
            const user = await this.userResolverFactory().getUserById(locationUserRole.userId);

            return {
              ...user,
              id: locationUserRole.userId
            };
          })
        );
      } else {
        return locationUserRoles.map(({ userId }) => ({ id: userId }));
      }
    },
    userRoles: async (location: Location, shouldExpand = false) => {
      return this.getAllUserRolesByLocationId(location.id);
    },
    account: async (location: Location, shouldExpand = false) => {

      if (!shouldExpand) {
        return location.account;
      }

      return this.accountResolverFactory().getAccount(location.account.id);
    },
    subscription: async (location: Location, shouldExpand = false) => {
      const subscription = await this.subscriptionResolverFactory().getByRelatedEntityId(location.id);

      if (subscription === null) {
        return null;
      }

      if (!shouldExpand) {
        return {
          id: subscription.id,
          provider: {
            isActive: subscription.provider.isActive
          }
        };
      }

      return subscription;
    },
    systemMode: async (location: Location, shouldExpand = false) => {

      if (!_.isEmpty(_.pickBy(location.systemMode, _.identity))) {
        const {
          target,
          revertScheduledAt,
          revertMinutes,
          revertMode,
          ...systemModeData
        } = location.systemMode || {
          target: undefined,
          revertScheduledAt: undefined,
          revertMode: undefined,
          revertMinutes: undefined
        };

        // TODO: Computed target is a hack to work around the fact that system mode reconciliation does not operate at
        // the system mode level. Once that is implemented at the reconcilation service level, remove this code. 
        const computedTarget = target === SystemMode.SLEEP && revertScheduledAt && moment().isAfter(revertScheduledAt) ?
          revertMode || SystemMode.HOME :
          target;
        const revertData = computedTarget !== SystemMode.SLEEP ?
          {} :
          {
            revertScheduledAt,
            revertMinutes,
            revertMode
          };

        return {
          ...systemModeData,
          ...revertData,
          target: computedTarget
        };
      }

      const devices = await this.deviceResolverFactory().getAllByLocationId(location.id, {
        $select: {
          systemMode: true
        }
      });
      const unlockedDevices = devices
        .filter((d: Device) =>
          d.systemMode &&
          !d.systemMode.isLocked
        );
      const device: Device | undefined =
        // If all devices are in forced sleep
        !unlockedDevices.length && devices.length ?
          // Then use the forced sleep system mode information
          devices.filter(({ systemMode }) => systemMode)[0] :
          // Otherwise, find an unlocked device
          unlockedDevices
            .sort((deviceA: Device, deviceB: Device) => {
              if (_.get(deviceA, 'systemMode.target') && !_.get(deviceB, 'systemMode.target')) {
                return -1;
              } else if (_.get(deviceB, 'systemMode.target') && !_.get(deviceA, 'systemMode.target')) {
                return 1;
              } else {
                return 0;
              }
            })[0];

      return {
        target: _.get(device, 'systemMode.target') || _.get(device, 'systemMode.lastKnown') || SystemMode.HOME,
        revertMinutes: device && device.systemMode && device.systemMode.revertMinutes,
        revertMode: device && device.systemMode && device.systemMode.revertMode,
        revertScheduledAt: device && device.systemMode && device.systemMode.revertScheduledAt
      };
    },
    irrigationSchedule: async (location: Location, shouldExpand = false) => {

      if (location.irrigationSchedule !== undefined) {
        return location.irrigationSchedule;
      }

      const devices = (await this.deviceResolverFactory().getAllByLocationId(location.id, { 
        $select: { 
          irrigationSchedule: { 
            $expand: true 
          } 
        } 
      }))
      .filter(device => device.irrigationSchedule !== undefined);

      return {
        isEnabled: _.get(devices[0], 'irrigationSchedule.isEnabled', false)
      };
    },
    notifications: async (location: Location, shouldExpand = false) => {
      
      if (!this.notificationService) {
        return null;
      }

      return this.notificationService.retrieveStatistics(`locationId=${location.id}`);
    },
    areas: async (location: Location, shouldExpand = false) => {
      const defaultAreas = await this.lookupServiceFactory().getByIds([DEFAULT_AREAS_ID], [], DEFAULT_LANG);
      return {
        ...location.areas,
        default: defaultAreas[DEFAULT_AREAS_ID].map((area: LookupItem) => ({
          id: area.key,
          name: area.shortDisplay
        }))
      };
    }
  };

  private deviceResolverFactory: () => DeviceResolver;
  private accountResolverFactory: () => AccountResolver;
  private userResolverFactory: () => UserResolver;
  private subscriptionResolverFactory: () => SubscriptionResolver;
  private notificationService: NotificationService;
  private lookupServiceFactory: () => LookupService;

  constructor(
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {
    super();

    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
    this.userResolverFactory = depFactoryFactory<UserResolver>('UserResolver');
    this.subscriptionResolverFactory = depFactoryFactory<SubscriptionResolver>('SubscriptionResolver');
    this.lookupServiceFactory = depFactoryFactory<LookupService>('LookupService');

    if (!_.isEmpty(this.httpContext) && this.httpContext.request.get('Authorization')) {
      this.notificationService = notificationServiceFactory.create(this.httpContext.request);
    }
  }

  public async get(id: string, expandProps?: PropExpand): Promise<Location | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(id);

    if (locationRecordData === null) {
      return null;
    }

    const location = new LocationRecord(locationRecordData).toModel();
    const resolvedProps = await this.resolveProps(location, expandProps);

    return {
      ...location,
      ...resolvedProps
    };
  }

  public async createLocation(location: Location): Promise<Location | null> {
    const locationRecordData = LocationRecord.fromModel(location);
    const locationId = locationRecordData.location_id = uuid.v4();

    const createdLocationRecordData = await this.locationTable.put(locationRecordData);

    return new LocationRecord(createdLocationRecordData).toModel();
  }

  public async updatePartialLocation(id: string, location: Partial<Location>): Promise<Location> {
    const locationRecordData = LocationRecord.fromPartialModel(location);
    const patch = fromPartialRecord(locationRecordData);
    const accountId: string | null = await this.getAccountId(id);

    if (accountId === null) {
      throw new ResourceDoesNotExistError();
    }

    const updatedLocationRecordData = await this.locationTable.update({ account_id: accountId, location_id: id }, patch);

    return new LocationRecord(updatedLocationRecordData).toModel();
  }

  public async removeLocation(id: string): Promise<void> {
    const accountId: string | null = await this.getAccountId(id);

    if (accountId !== null) {
      // TODO: Make this transactional.
      // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
      await Promise.all([
        this.locationTable.remove({ account_id: accountId, location_id: id }),

        this.removeLocationUsersAllByLocationId(id),

        ...(await this.deviceResolverFactory().getAllByLocationId(id))
          .map(async ({ id: icdId }) => this.deviceResolverFactory().remove(icdId)),

        this.subscriptionResolverFactory().getByRelatedEntityId(id).then<false | void>(subscription =>
          subscription !== null && this.subscriptionResolverFactory().remove(subscription.id)
        )
      ]);
    } else {
      throw new ResourceDoesNotExistError();
    }
  }

  public async getAllByAccountId(accountId: string, expandProps?: PropExpand): Promise<Location[]> {
    const locationRecordData = await this.locationTable.getAllByAccountId(accountId);

    return Promise.all(
      locationRecordData
        .map(async (datum) => {
          const location = new LocationRecord(datum).toModel();
          const resolvedProps = await this.resolveProps(location, expandProps);

          return {
            ...location,
            ...resolvedProps
          };
        })
    );
  }

  public async getAllUserRolesByLocationId(locationId: string): Promise<LocationUserRole[]> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    return Promise.all(
      userLocationRoleRecordData
        .map(userLocationRoleDatum =>
          new UserLocationRoleRecord(userLocationRoleDatum).toLocationUserRole()
        )
    );
  }

  public async addLocationUserRole(locationId: string, userId: string, roles: string[]): Promise<LocationUserRole> {
    const [user, location] = await Promise.all([
      this.userResolverFactory().getUserById(userId),
      this.get(locationId),
    ]);


    if (user === null || location === null) {
      throw new ResourceDoesNotExistError();
    }

    const userLocatioRoleRecordData = {
      user_id: userId,
      location_id: locationId,
      roles
    };
    const createdUserLocatioRoleRecordData = await this.userLocationRoleTable.put(userLocatioRoleRecordData);

    return new UserLocationRoleRecord(createdUserLocatioRoleRecordData).toLocationUserRole();
  }

  public async removeLocationUserRole(locationId: string, userId: string): Promise<void> {
    return this.userLocationRoleTable.remove({ user_id: userId, location_id: locationId });
  }

  public async removeLocationUsersAllByLocationId(locationId: string): Promise<void> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    // TODO: Make this transactional.
    // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
    await Promise.all(
      userLocationRoleRecordData
        .map(async datum =>
          this.removeLocationUserRole(datum.location_id, datum.user_id)
        )
    );
  }

  // The DynamoDB Location table has account_id as a hash key on the primary
  // table. The location_id is only a hash key on a Global Second Index on the
  // table, and writes are not permitted against indices in Dynamo.
  // Therefore we must retrieve the account_id before doing any writes where we only
  // have the location_id previously known.
  private async getAccountId(locationId: string): Promise<string | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(locationId);

    return locationRecordData === null ? null : locationRecordData.account_id;
  }
}

export { LocationResolver };

