import * as O from 'fp-ts/lib/Option';
import { inject, injectable, targetName } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { AccessControlService } from '../../auth/AccessControlService';
import { Areas, DependencyFactoryFactory, Location, LocationUpdate, LocationUserRole, PropExpand, SystemMode } from '../api';
import ConflictError from '../api/error/ConflictError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import ForbiddenError from '../api/error/ForbiddenError';
import { DeviceSystemModeService } from '../device/DeviceSystemModeService';
import { IrrigationScheduleService } from '../device/IrrigationScheduleService';
import { LocationResolver } from '../resolver';
import { AccountService, DeviceService, SubscriptionService, EntityActivityAction, EntityActivityService, EntityActivityType } from '../service';
import moment from 'moment';
import LocationTreeTable, { LocationTreeRow } from './LocationTreeTable'
import { pipe } from 'fp-ts/lib/pipeable';

const { fromNullable, isNone } = O;
type Option<T> = O.Option<T>;

@injectable()
class LocationService {
  private deviceServiceFactory: () => DeviceService;
  private accountServiceFactory: () => AccountService;
  private subscriptionServiceFactory: () => SubscriptionService;

  constructor(
    @inject('LocationResolver') private locationResolver: LocationResolver,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext,
    @inject('AccessControlService') private accessControlService: AccessControlService,
    @inject('LocationTreeTable') private locationTreeTable: LocationTreeTable,
    @inject('IrrigationScheduleService') private irrigationScheduleService: IrrigationScheduleService,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.accountServiceFactory = depFactoryFactory<AccountService>('AccountService');
    this.subscriptionServiceFactory = depFactoryFactory<SubscriptionService>('SubscriptionService');
  }

  public async createLocation(location: Location, userId?: string): Promise<Option<Location>> {
    const createdLocation: Location | null = await this.locationResolver.createLocation(location);
    const accountId = location.account.id;
    const account = await this.accountServiceFactory().getAccountById(accountId);

    if (createdLocation === null || isNone(account)) {
      return O.none;
    }

    const ownerUserId = account.value.owner.id;
    const rolePromises: Array<Promise<any>> = [];
    const aclPromises: Array<() => Promise<any>> = [];
    
    rolePromises.push(
      this.locationResolver.addLocationUserRole(createdLocation.id, ownerUserId, ['owner'])
    );
    aclPromises.push(
      () => this.refreshUserACL(ownerUserId)
    );

    // If user executing creation belongs to the account and is not the owner, grant them full access
    if (userId && userId !== ownerUserId && _.find(account.value.users, { id: userId })) {
      rolePromises.push(
        this.locationResolver.addLocationUserRole(createdLocation.id, userId, ['write'])
      );
      aclPromises.push(
        () => this.refreshUserACL(userId)
      );
    }

    await Promise.all(rolePromises);
    await Promise.all(aclPromises.map(thunk => thunk()));

    if (createdLocation.parent && createdLocation.parent.id) {
      await this.locationTreeTable.updateParent(account.value.id, createdLocation.id, createdLocation.parent.id, false);
    }

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.LOCATION,
      EntityActivityAction.CREATED,
      createdLocation
    );

    return fromNullable(createdLocation);
  }

  public async getLocation(id: string, expand?: PropExpand): Promise<Option<Location>> {
    const location: Location | null = await this.locationResolver.get(id, expand);

    return fromNullable(location);
  }

  public async updatePartialLocation(id: string, locationUpdate: LocationUpdate): Promise<Location> {

    if (locationUpdate.parent !== undefined && (locationUpdate.parent === null || locationUpdate.parent.id !== id)) {
      const location = await this.locationResolver.get(id, { $select: { parent: true, account: true } });

      if (!location) {
        throw new ConflictError('Location does not exist.');
      }

      const hasNewParent = locationUpdate.parent !== null;
      const parentLocation = locationUpdate.parent !== null && await this.locationResolver.get(locationUpdate.parent.id, { $select: { account: true } });

      if (locationUpdate.parent !== null && !parentLocation) {
        throw new ValidationError('Parent does not exist.');
      } else if (hasNewParent && location && parentLocation && parentLocation.account.id !== location.account.id) {
        // Parent must be in same account
        throw new ForbiddenError();
      }

      // Noop if parent is not changing to avoid expensive SQL queries
      if ((location.parent && location.parent.id) !== (locationUpdate.parent && locationUpdate.parent.id)) {
        await this.locationTreeTable.updateParent(
          location.account.id, 
          id, 
          locationUpdate.parent && locationUpdate.parent.id, 
          !!(location && location.parent && location.parent.id)
        );
      }
    }

    const updatedLocation = await this.locationResolver.updatePartialLocation(id, {
      ...locationUpdate,
      ...(locationUpdate.parent === null ? 
        {
          parent: {
            id: ""
          }
        } : 
        locationUpdate.parent && { parent: locationUpdate.parent }
      )
    });

    if (!_.isEmpty(locationUpdate.irrigationSchedule) && !_.isEmpty(this.irrigationScheduleService)) {
      const deviceService = this.deviceServiceFactory();

      if (_.get(locationUpdate, 'irrigationSchedule.isEnabled', false)) {
        const devices = await deviceService.getAllByLocationId(id, { 
          $select: { 
            id: true,
            irrigationSchedule: { 
              $expand: true 
            } 
          } 
        });
        const promises = devices
          .map(async (device) => {
            if  (
               device.irrigationSchedule === undefined ||
               device.irrigationSchedule.computed === undefined ||
               device.irrigationSchedule.computed.times === undefined
            ) {
              return Promise.resolve();
            }

            const times = device.irrigationSchedule.computed.times;

            return this.irrigationScheduleService.enableDeviceIrrigationAllowedInAwayMode(device.id, times);
          });

        await Promise.all(promises);
      } else {
        const devices = await deviceService.getAllByLocationId(id, {
          $select: {
            id: true
          }
        });
        const promises = devices
          .map(async (device) =>
            this.irrigationScheduleService.disableDeviceIrrigationAllowedInAwayMode(device.id)
          );

        await Promise.all(promises);
      }
    }

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.LOCATION,
      EntityActivityAction.UPDATED,
      updatedLocation
    );

    return updatedLocation;
  }

  public async removeLocation(id: string): Promise<void> {
    const subscriptionService = this.subscriptionServiceFactory();
    const subscription = await subscriptionService.getSubscriptionByRelatedEntityId(id);
    const location = await this.locationResolver.get(id);

    if (!location) {
      throw new ConflictError('Location not found.');
    }

    await this.locationResolver.removeLocation(id);

    if (!isNone(subscription)) {
      await this.subscriptionServiceFactory().cancelSubscription(subscription.value.id, true, `FLO INTERNAL: location ${ id } removed`);
    }

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.LOCATION,
      EntityActivityAction.DELETED,
      location
    );
  }

  public async getAllLocationUserRoles(locationId: string): Promise<LocationUserRole[]> {
   return this.locationResolver.getAllUserRolesByLocationId(locationId);
  }

  public async addLocationUserRole(locationId: string, userId: string, roles: string[], shouldRefreshAcl: boolean = true): Promise<LocationUserRole> {
    const locationUserRole = await this.locationResolver.addLocationUserRole(locationId, userId, roles);

    if (shouldRefreshAcl) {
      await this.refreshUserACL(userId);
    }

    return locationUserRole;
  }

  public async removeLocationUserRole(locationId: string, userId: string): Promise<void> {
    await this.locationResolver.removeLocationUserRole(locationId, userId);

    const authToken = this.httpContext.request && this.httpContext.request.get('Authorization');

    if (authToken) {
      await this.accessControlService.refreshUser(authToken, userId);
    }
  }

  public async setSystemMode(id: string, deviceSystemModeService: DeviceSystemModeService, { target, revertMinutes, revertMode, shouldCascade }: { target: SystemMode, revertMinutes?: number, revertMode?: SystemMode, shouldCascade?: boolean }): Promise<void> {
    const deviceService = this.deviceServiceFactory();
    const devices = await deviceService.getAllByLocationId(id);
    const unlockedDevices = devices.filter(({ systemMode }) => !(systemMode && systemMode.isLocked));
    const accountId = shouldCascade &&
      pipe(
        await this.getLocation(id, { $select: { account: { $select: { id: true } } } }),
        O.fold(
          () => undefined,
          ({ account: { id: accId } }) => accId
        )
      );
    const childLocations = shouldCascade && accountId ? 
      (await this.locationTreeTable.getAllChildren(accountId, id)).map(({ child_id }) => child_id) :
      [];

    if (devices.length && !unlockedDevices.length) {

      throw new ConflictError('All devices are in locked system mode state.');

    } else if (target === SystemMode.SLEEP) {
      const now = new Date().toISOString();
      const revertScheduledAt = moment(now).add(revertMinutes, 'minutes').toISOString();
      const promises = unlockedDevices
        .map(async device => {

          await deviceSystemModeService.sleep(device.id, revertMinutes || 0, revertMode || SystemMode.HOME);
          await deviceService.updatePartialDevice(device.id, {
            systemMode: {
              target,
              revertMinutes,
              revertMode,
              revertScheduledAt,
              shouldInherit: true
            }
          });
        })
        .concat(
          childLocations.map(childLocationId => 
            this.setSystemMode(
              childLocationId, 
              deviceSystemModeService, 
              { target, revertMinutes, revertMode })
            )
        );

      await Promise.all(promises);
      await this.locationResolver.updatePartialLocation(id, {
        systemMode: {
          target,
          revertMinutes,
          revertMode,
          revertScheduledAt
        }
      });

    } else {
      const promises = unlockedDevices
        .map(async device => {

          await deviceSystemModeService.setSystemMode(device.id, target);

          await deviceService.updatePartialDevice(device.id, {
            systemMode: {
              target,
              shouldInherit: true
            }
          });
        })
        .concat(
          childLocations.map(childLocationId => 
            this.setSystemMode(
              childLocationId, 
              deviceSystemModeService, 
              { target, revertMinutes, revertMode })
            )
        );

      await Promise.all(promises);
      await this.locationResolver.updatePartialLocation(id, {
        systemMode: {
          target
        }
      });
    }
  }

  public async addArea(locationId: string, areaName: string): Promise<Areas> {
    const location: Location = await this.getSafeLocation(locationId);

    this.validateAreaDoesNotExist(location.areas, areaName);

    const updatedLocation = await this.locationResolver.updatePartialLocation(locationId, {
      areas: {
        default: location.areas.default,
        custom: [
          ...location.areas.custom,
          {
            id: uuid.v4(),
            name: areaName
          }
        ]
      }
    });

    return {
      default: location.areas.default,
      custom: updatedLocation.areas.custom
    };
  }

  public async renameArea(locationId: string, areaId: string, newAreaName: string): Promise<Areas> {
    const location: Location = await this.getSafeLocation(locationId);
    const customAreaMap: { [s: string]: string; } = location.areas.custom.reduce((acc, area) => ({
      ...acc,
      [area.id]: area.name
    }), {});

    if (_.isNil(customAreaMap[areaId])) {
      throw new ResourceDoesNotExistError('Area does not exist.');
    }

    this.validateAreaDoesNotExist(location.areas, newAreaName, customAreaMap[areaId]);

    const updatedLocation = await this.locationResolver.updatePartialLocation(locationId, {
      areas: {
        default: location.areas.default,
        custom: location.areas.custom.map(a => ({
          id: a.id,
          name: a.id === areaId ? newAreaName : a.name
        }))
      }
    });

    return {
      default: location.areas.default,
      custom: updatedLocation.areas.custom
    };
  }

  public async removeArea(locationId: string, areaId: string): Promise<Areas> {
    const location: Location = await this.getSafeLocation(locationId);
    const filteredCustomAreas = location.areas.custom.filter(area => area.id !== areaId);

    if (filteredCustomAreas.length === location.areas.custom.length) {
      throw new ResourceDoesNotExistError('Area does not exist.');
    }

    const updatedLocation = await this.locationResolver.updatePartialLocation(locationId, {
      areas: {
        default: location.areas.default,
        custom: filteredCustomAreas
      }
    });

    const deviceService = this.deviceServiceFactory();
    const devices = await deviceService.getAllByLocationId(locationId);
    const devicesInArea = devices.filter(d => d.area && d.area.id === areaId);
    await Promise.all(devicesInArea.map(async d => (
      deviceService.updatePartialDevice(d.id, { area: { id: '' }})
    )));

    return {
      default: location.areas.default,
      custom: updatedLocation.areas.custom
    };
  }

  public async getAllParentIds(locationId: string): Promise<string[]> {
    const location = await this.getLocation(locationId, { 
      $select: {
        id: true,
        account: {
          $select: {
            id: true
          }
        }
      }
    });

    if (O.isNone(location)) {
      return [];
    }

    const parentIds = await this.locationTreeTable.getAllParents(location.value.account.id, locationId);

    return parentIds.map(({ parent_id }) => parent_id);
  }

  public async getAllChildren(location: Location): Promise<LocationTreeRow[]> {
    return this.locationTreeTable.getAllChildren(location.account.id, location.id);
  }

  private validateAreaDoesNotExist(areas: Areas, newAreaName: string, oldAreaName?: string): void {
    const defaultAreas = areas.default.map(a => a.name.toLowerCase());
    const customAreas = areas.custom.map(a => a.name.toLowerCase());
    const areaSet = new Set(defaultAreas.concat(customAreas));
    const isUpdateAndAreaExists = oldAreaName && oldAreaName.toLowerCase() !== newAreaName.toLowerCase();

    if (areaSet.has(newAreaName.toLowerCase()) && isUpdateAndAreaExists) {
      throw new ValidationError(`Area '${newAreaName}' already exists.`);
    }
  }

  private async getSafeLocation(locationId: string): Promise<Location> {
    const location: Location | null = await this.locationResolver.get(locationId);

    if (location === null) {
      throw new ResourceDoesNotExistError('Location does not exist.');
    }
    return location;
  }

  private async refreshUserACL(userId: string): Promise<void> {
    const authToken = this.httpContext.request && this.httpContext.request.get('Authorization');

    if (authToken) {
      await this.accessControlService.refreshUser(authToken, userId);
    }
  }
}

export { LocationService };
