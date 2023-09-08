import { inject, injectable } from 'inversify';
import { interfaces, TYPE } from 'inversify-express-utils';
import { injectableHttpContext } from '../../cache/InjectableHttpContextUtils';
import * as _ from 'lodash';
import * as uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { LocationFacetPage, LocationFilters, DependencyFactoryFactory, Device, Location, LocationUserRole, LookupItem, PropExpand, SystemMode, LocationPage, LocationSortProperties } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import LocationTable from '../location/LocationTable';
import { NotificationService } from '../notification/NotificationService';
import { AccountResolver, DeviceResolver, PropertyResolverMap, Resolver, SubscriptionResolver, UserResolver } from '../resolver';
import { LookupService } from '../service';
import { UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import UserLocationRoleTable from '../user/UserLocationRoleTable';
import { LocationRecord, LocationRecordData } from './LocationRecord';
import moment from 'moment';
import LocationTreeTable from './LocationTreeTable';
import ConflictError from '../api/error/ConflictError';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import LocationPgTable from './LocationPgTable';
import { LocationPgRecord } from './LocationPgRecord';
import { WeatherApi } from '../water/WeatherApi';
import Request from '../api/Request';

const DEFAULT_LANG = 'en';
const DEFAULT_AREAS_ID = 'areas.default';

@injectable()
class LocationResolver extends Resolver<Location> {
  
  protected propertyResolverMap: PropertyResolverMap<Location> = {
    devices: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {
      
      const devices = await this.deviceResolverFactory().getAllByLocationId(location.id, shouldExpand 
        ? expandProps 
        : { $select: {  id: true, macAddress : true } });

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
    users: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {
      const hasAccountPrivilege = await this.accountResolverFactory().hasPrivilege(location.account.id);
      const currentUserId = (this.httpContext.request as Request)?.token?.user_id;

      if (!hasAccountPrivilege && !currentUserId) {
        return null;
      }

      const locationUserRoles = await this.getAllUserRolesByLocationId(location.id);
      const parents = await this.locationTreeTable.getAllParents(location.account.id, location.id);
      const parentUsers = _.flatten(await Promise.all(
        parents.map(({ parent_id }) => 
          this.getAllUserRolesByLocationId(parent_id)
        )
      ))
      .map(({ userId }) => userId);

      const userIds = _.uniq([
        ...parentUsers,
        ...locationUserRoles.map(({ userId }) => userId)
      ])
      .filter(userId => hasAccountPrivilege || userId === currentUserId);

      if (shouldExpand) {
        return Promise.all(
          userIds.map(async userId => {
            const user = await this.userResolverFactory().getUserById(userId, expandProps);

            return {
              ...user,
              id: userId
            };
          })
        );
      } else {
        return userIds.map(id => ({ id }));
      }
    },
    userRoles: async (location: Location, shouldExpand = false) => {
      const hasAccountPrivilege = await this.accountResolverFactory().hasPrivilege(location.account.id);
      const currentUserId = (this.httpContext.request as Request)?.token?.user_id;

      if (!hasAccountPrivilege && !currentUserId) {
        return null;
      }

      const explicitUserRoles = await this.getAllUserRolesByLocationId(location.id);
      const parents = await this.locationTreeTable.getAllParents(location.account.id, location.id);
      const parentUserRoles = _.flatten(await Promise.all(
        parents.map(async ({ parent_id }) => {
          const userRoles = await this.getAllUserRolesByLocationId(parent_id);

          return userRoles.map(userRole => ({ ...userRole, locationId: parent_id }));
        })
      )) as Array<{ userId: string, locationId: string, roles: string[] }>;

      let visibleUserRoles= [...explicitUserRoles, ...parentUserRoles]
      if (!hasAccountPrivilege) {
        const ans = this.accountResolverFactory().getMaxSecurityLevel(visibleUserRoles);
        visibleUserRoles = visibleUserRoles.filter(({userId }) => (ans[userId].maxLevel ?? 0) <= ans[currentUserId].maxLevel);
      }

      return _.chain(visibleUserRoles)
        .groupBy('userId')
        .map((userRoles, userId) => {
           return {
             userId,
             roles: _.chain(userRoles)
               .filter((userRole: any) => !userRole.locationId)
               .flatMap(({ roles }) => roles)
               .value(),
             inherited: parentUserRoles.length ? 
                 _.chain(parentUserRoles)
                   .filter({ userId })
                   .map(({ roles, locationId }) => ({ roles, locationId }))
                   .value() :
                 undefined
           }
        })
        .value();
    },
    account: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {

      if (!shouldExpand) {
        return location.account;
      }

      return this.accountResolverFactory().getAccount(location.account.id, expandProps);
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

      const childrenUnits = await this.getAllChildrenUnits(location);
      const locationIds = _.isEmpty(childrenUnits) ? [location.id] : childrenUnits;
      return this.notificationService.retrieveStatisticsInBatch({locationIds});
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
    },
    class: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {
      const lists = await this.lookupServiceFactory().getByIds(['location_class_types']);
      const classTypes = lists.location_class_types;

      if (!classTypes || !classTypes.length) {
        return null;
      }

      const locationClass = (
        _.find(classTypes, item => item.key === location.class.key) ||
        _.find(classTypes, item => !!(item.data || {}).isDefault)
      );

      if (locationClass) {
        return {
          key: locationClass.key,
          level: locationClass.data.level
        };
      } else {
        return null;
      }

    },
    parent: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {

      if (!location.parent) {
        return location.parent;
      }

      const req = this.httpContext.request as Request;
      const currentUserId = req?.token?.user_id;
      const currentClientId = req?.token?.client_id;
      const isAppOrAdmin = (!currentUserId && currentClientId) && req?.token?.isAdmin();
      const hasPrivilege = isAppOrAdmin || (await this.hasAccess(currentUserId, location.parent.id));

      if (hasPrivilege && shouldExpand) {
        const parent = await this.get(location.parent.id, expandProps); 
        return parent;
      }

      const parent = await this.get(location.parent.id, {
        $select: {
          nickname: true
        }
      });

      return parent && {
        id: location.parent.id,
        nickname: parent.nickname || parent.address
      };
    },
    children: async (location: Location, shouldExpand = false, expandProps?: PropExpand) => {
      const childIds = await this.locationTreeTable.getImmediateChildren(location.account.id, location.id);
      const children = await Promise.all(
         childIds.map(async ({ child_id }) => {
           if (shouldExpand) {
             return this.get(child_id, expandProps);
           } 

           const child = await this.get(child_id, { $select: { nickname: true } });

           return child && {
             id: child_id,
             nickname: child.nickname || child.address
           }
         })
       );

      return children.filter(child => child) as Array<Location | { id: string, nickname: string }>;
    },
    metrics: async (location: Location, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }
      const weatherData = await this.weatherApi.getTemperatureByAddress({
        street: location.address,
        city: location.city,
        postCode: location.postalCode,
        region: location.state,
        country: location.country
      }, 
      moment().subtract(1, 'hour').toDate(), 
      moment().toDate()
      );
      const currentAreaTempF = weatherData.current;
      
      return {
        currentAreaTempF
      }
    },
  };

  private deviceResolverFactory: () => DeviceResolver;
  private accountResolverFactory: () => AccountResolver;
  private userResolverFactory: () => UserResolver;
  private subscriptionResolverFactory: () => SubscriptionResolver;
  private lookupServiceFactory: () => LookupService;

  constructor(
    @injectableHttpContext private readonly httpContext: interfaces.HttpContext,
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('NotificationService') private notificationService: NotificationService,
    @inject('LocationTreeTable') private locationTreeTable: LocationTreeTable,
    @inject('LocationPgTable') private locationPgTable: LocationPgTable,
    @inject('WeatherApi') private weatherApi: WeatherApi
  ) {
    super();

    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
    this.userResolverFactory = depFactoryFactory<UserResolver>('UserResolver');
    this.subscriptionResolverFactory = depFactoryFactory<SubscriptionResolver>('SubscriptionResolver');
    this.lookupServiceFactory = depFactoryFactory<LookupService>('LookupService');
  }

  public async get(id: string, expandProps?: PropExpand): Promise<Location | null> {
    const locationRecordData = await this.locationTable.getByLocationId(id);

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

  public async createLocation(location: Omit<Location, 'id'> & { id?: string }): Promise<Location | null> {
    const locationRecordData = LocationRecord.fromModel({
      ...location,
      id: location.id || uuid.v4()
    });
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
      const location = await this.get(id, { $select: { children: true, devices: true } });

      if (location && ((location.children && location.children.length > 0) || (location.devices && location.devices.length > 0))) {
        throw new ConflictError('Cannot delete a location that has children or devices attached.');
      }

      // TODO: Make this transactional.
      // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
      await Promise.all([
        this.locationTable.remove({ account_id: accountId, location_id: id }),
        this.locationTreeTable.removeSubTree(accountId, id),
        this.removeLocationUsersAllByLocationId(id),

        // ...(await this.deviceResolverFactory().getAllByLocationId(id))
        //   .map(async ({ id: icdId }) => this.deviceResolverFactory().remove(icdId)),
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

  public async getByUserId(userId: string, expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string, sortProperties?: LocationSortProperties): Promise<LocationPage> {
    const { items, total } = await this.locationPgTable.getByUserId(userId, size, page, filters, searchText, sortProperties);
    const locations = await Promise.all(
      items.map(async item => {
        const location = LocationPgRecord.toModel(item);
        const resolved = await this.resolveProps(location, expandProps);

        return {
          ...location,
          ...resolved
        };
      })
    );

    return {
      total,
      page: page || 1,
      items: locations
    }
  }

  public async getByUserIdRootOnly(userId: string, expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string, sortProperties?: LocationSortProperties): Promise<LocationPage> {
    const { items, total } = await this.locationPgTable.getByUserIdRootOnly(userId, size, page, filters, searchText, sortProperties);
    const locations = await Promise.all(
      items.map(async item => {
        const location = LocationPgRecord.toModel(item);
        const resolved = await this.resolveProps(location, expandProps);

        return {
          ...location,
          ...resolved
        };
      })
    );

    return {
      total,
      page: page || 1,
      items: locations
    }
  }

  public async getByUserIdWithChildren(userId: string, expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string, sortProperties?: LocationSortProperties): Promise<LocationPage> {
    const { items, total } = await this.locationPgTable.getByUserIdWithChildren(userId, size, page, filters, searchText, sortProperties);
    const locations = await Promise.all(
      items
        .map(async locationRecord => {
          const location = LocationPgRecord.toModel(locationRecord);
          const resolvedProps = await this.resolveProps(location, expandProps);

          return {
            ...location,
            ...resolvedProps
          };
        })
    );

    return {
      total,
      page: page || 1,
      items: locations
    }

  }

  public async getAllByFilters(expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string, sortProperties?: LocationSortProperties): Promise<LocationPage> {
    const { items, total } = await this.locationPgTable.getAllByFilters(size, page, filters, searchText, sortProperties);
    const locations = await Promise.all(
      items
        .map(async locationRecord => {
          const location = LocationPgRecord.toModel(locationRecord);
          const resolvedProps = await this.resolveProps(location, expandProps);

          return {
            ...location,
            ...resolvedProps
          };
        })
    );

    return {
      total,
      page: page || 1,
      items: locations
    }
  }

  public async getAllChildrenUnits(location: Location): Promise<string[]> {
    const childIds = await this.locationTreeTable.getAllChildren(location.account.id, location.id);
    const childLocations = await Promise.all(
      childIds.map(({ child_id: childId }) => 
        this.get(childId, {
          $select: {
            id: true,
            ['class']: true
          }
        })
      )
    );
    return _.flatMap(childLocations, maybeChildLocation => 
      pipe(
        Option.fromNullable(maybeChildLocation),
        Option.fold(
          () => [],
          childLocation => childLocation.class.key === 'unit' ? [childLocation.id] : []
        )
      )
    )
  }

  public async getFacetsByUserId(userId: string, facets: string[], size?: number, page?: number, contains?: string): Promise<LocationFacetPage> {
    const facetPages = await Promise.all(
      facets
        .map(async facet => {
          return this.locationPgTable.getFacetByUserId(userId, facet, size, page, contains);
        })
    );

    return {
      page: facetPages[0]?.page || 1,
      items: facetPages
    };
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

  private async hasAccess(userId: string, locationId: string, pageSize: number = 50, pageNum: number = 1): Promise<boolean> {
    const { total, items } = await this.getByUserIdWithChildren(
      userId, 
      {
        $select: {
          id: true
        }
      }, 
      pageSize, 
      pageNum
    );

    if (_.find(items, { id: locationId })) {
      return true;
    }

    if (((pageNum - 1) * pageSize) + items.length < total) {
      return this.hasAccess(userId, locationId, pageSize, pageNum + 1);
    }

    return false;
  }



}

export { LocationResolver };