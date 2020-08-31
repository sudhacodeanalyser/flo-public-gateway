import * as O from 'fp-ts/lib/Option';
import { inject, injectable, targetName } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { AccessControlService } from '../../auth/AccessControlService';
import { Subscription, LocationFacetPage, LocationFilters, Areas, DependencyFactoryFactory, Location, LocationUpdate, LocationUserRole, PropExpand, SystemMode, Device, DeviceType, PesThresholds, LocationPage } from '../api';
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
import { MachineLearningService } from '../../machine-learning/MachineLearningService';
import NotFoundError from '../api/error/NotFoundError';

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
    @inject('EntityActivityService') private entityActivityService: EntityActivityService,
    @inject('MachineLearningService') private mlService: MachineLearningService
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.accountServiceFactory = depFactoryFactory<AccountService>('AccountService');
    this.subscriptionServiceFactory = depFactoryFactory<SubscriptionService>('SubscriptionService');
  }

  public async createLocation(location: Omit<Location, 'id'> & { id?: string }, userId?: string, roles: string[] = ['write', 'valve-open', 'valve-close']): Promise<Option<Location>> {

    if (location.parent?.id) {
      await this.validateParent(location.account.id, location.parent.id);
    }

    const createdLocation: Location | null = await this.locationResolver.createLocation(location);
    const accountId = location.account.id;
    const account = await this.accountServiceFactory().getAccountById(accountId);

    if (createdLocation === null || isNone(account) || !account.value?.owner?.id) {
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
        this.locationResolver.addLocationUserRole(createdLocation.id, userId, roles)
      );
      aclPromises.push(
        () => this.refreshUserACL(userId)
      );
    }

    await Promise.all(rolePromises);
    await Promise.all(aclPromises.map(thunk => thunk()));

    if (createdLocation.parent && createdLocation.parent.id) {
      await this.updateParent(account.value.id, createdLocation.id, createdLocation.parent.id, false, true);
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
        await this.updateParent(
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

  public async forwardPes(id: string, method: string, subPath: string, data: any, shouldCascade?: boolean): Promise<void> {
    const devices = await this.getDevices(id, {
      $select: {
        macAddress: true,
        deviceType: true
      }
    }, shouldCascade);

    await Promise.all(
      devices
        .filter(device => device.deviceType !== DeviceType.PUCK)
        .map(device => this.mlService.forward(method, `${ device.macAddress }/pes/${ subPath }`, data))
    );
  }

  public async updatePes(locationId: string, pesThresholds: PesThresholds): Promise<void> {
    const payload = {
      floSense: {
        userEnabled: false,
        pesOverride: {
          home: {
            shutoffDisabled: false,
            shutoffDelay: 300,
            eventLimits: {
              ...pesThresholds,
              flowRateDuration: 20
            }
          },
          away: {
            shutoffDisabled: false,
            shutoffDelay: 0,
            eventLimits: {
              ...pesThresholds,
              flowRateDuration: 5
            }
          }
        }
      }
    };

    const isDevice = (d: Partial<Device>): d is Pick<Device, 'macAddress'> => {
      return !_.isNil(d.macAddress) && d.deviceType !== DeviceType.PUCK;
    };

    const devices = await this.getDevices(locationId, {
      $select: {
        macAddress: true,
        deviceType: true
      }
    }, true);
    
    await Promise.all(
      devices
        .filter(isDevice)
        .map(device => this.mlService.update(device.macAddress, payload))
    );
  }

  public async getUnitLocations(locationIds: string[]): Promise<string[]> {
    const locations = await Promise.all(
      locationIds.map(async l => this.getLocation(l, {
        $select: {
          id: true,
          account: {
            $select: {
              id: true
            }
          },
          ['class']: true
        }
      }))
    );
     
    return _.flatten((await Promise.all(_.map(locations, async (maybeLocation) => 
      pipe(
        maybeLocation,
        O.fold(
          async () => [],
          async l => l.class.key === 'unit' ? [l.id] : this.locationResolver.getAllChildrenUnits(l)
        )
      )
    ))));
  }

  public async getByUserIdWithChildren(userId: string, expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string): Promise<LocationPage> {
    return this.locationResolver.getByUserIdWithChildren(userId, expandProps, size, page, filters, searchText);
  }

  public async getByUserId(userId: string, expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string): Promise<LocationPage> {
    return this.locationResolver.getByUserId(userId, expandProps, size, page, filters, searchText);
  }

  public async getByUserIdRootOnly(userId: string, expandProps?: PropExpand, size?: number, page?: number, filters?: LocationFilters, searchText?: string): Promise<LocationPage> {
    return this.locationResolver.getByUserIdRootOnly(userId, expandProps, size, page, filters, searchText);
  }

  public async getFacetsByUserId(userId: string, facets: string[], size?: number, page?: number, contains?: string): Promise<LocationFacetPage> {
    return this.locationResolver.getFacetsByUserId(userId, facets, size, page, contains);
  }

  public async transferLocation(destAccountId: string, srcLocationId: string): Promise<Location> {
    const srcLocation = O.toNullable(await this.getLocation(srcLocationId));

    if (!srcLocation) {
      throw new ResourceDoesNotExistError('Location does not exist.');
    }

    if (srcLocation?.parent?.id || srcLocation?.children?.length) {
      throw new ConflictError('Cannot transfer location with parent or children.');
    } 

    const subscription = srcLocation.subscription as Subscription | undefined;

    if (subscription && subscription?.provider?.isActive) {
      throw new ConflictError('Cannot transfer location with subscription.');
    }

    const {
      id,
      account,
      ...locationData
    } = srcLocation;
    const clonedLocation = O.toNullable(await this.createLocation({
      ...locationData,
      account: { id: destAccountId }
    }));

    if (!clonedLocation) {
      throw new Error(`Failed to copy location ${ srcLocationId }`);
    }

    await this.transferDevices(clonedLocation.id, srcLocationId);

    await this.updatePartialLocation(srcLocationId, { _mergedIntoLocationId: clonedLocation.id });

    return clonedLocation;
  }

  public async transferDevices(destLocationId: string, srcLocationId: string): Promise<void> {
    const srcLocation = O.toNullable(await this.getLocation(srcLocationId, {
      $select: {
        devices: {
          $select: {
            id: true
          }
        }
      }
    }));

    if (!srcLocation) {
      throw new ResourceDoesNotExistError('Location not found.');
    }

    const deviceService = this.deviceServiceFactory();

    await Promise.all(
      srcLocation.devices
        .map(({ id }) => 
          deviceService.transferDevice(id, destLocationId)
        )
    );

    await this.updatePartialLocation(srcLocationId, { _mergedIntoLocationId: destLocationId });
  }

  public async getLocationsFromDevices(deviceIds: string[]): Promise<string[]> {
    const deviceService = this.deviceServiceFactory();
    const maybeDevices = await Promise.all(deviceIds.map(deviceId => deviceService.getDeviceById(deviceId, {
        $select: {
          location: {
            $select: {
              id: true
            }
          }
        }
      }
    )));

    if (maybeDevices.some(mayBeADevice => O.isNone(mayBeADevice))) {
      throw new NotFoundError('Device not found');
    }

    return maybeDevices.map(mayBeADevice => pipe(mayBeADevice, O.map(({ location: { id } }) => id), O.toUndefined)) as string[];
  }

  private async getDevices(locationId: string, deviceExpand: PropExpand, shouldCascade?: boolean): Promise<Array<Partial<Device>>> {
    const location = O.toNullable(await this.getLocation(locationId, { 
      $select: { 
        id: true,
        account: {
          $select: {
            id: true
          }
        },
        devices: deviceExpand
      }
    }));

    if (!location) {
      throw new ResourceDoesNotExistError('Location does not exist.');
    }

    const devices: Array<Partial<Device>> = [...location.devices as Device[]];

    const cascadeDevices = async () => {
      const childIds = await this.getAllChildren(location);
      const childLocations = await Promise.all(
        childIds.map(({ child_id }) => this.getLocation(child_id, {
          $select: {
            devices: deviceExpand
          }
        }))
      );

      return _.chain(childLocations)
        .map(opt => O.toNullable(opt))
        .flatMap(loc => (loc ? loc.devices : []) as Device[])
        .value();
    }

    return _.concat(devices, shouldCascade ? await cascadeDevices() : []);
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

  private async validateParent(accountId: string, parentId: string | null): Promise<true> {
    if (parentId) {
      const parent = O.toNullable(await this.getLocation(parentId, {
        $select: {
          account: {
            $select: {
              id: true
            }
          }
        }
      }));   

      if (!parent) {
        throw new ResourceDoesNotExistError('Location not found.');
      } else if (accountId !== parent.account.id) {
        throw new ForbiddenError('Forbidden.');
      }
    }

    return true;
  }

  private async updateParent(accountId: string, id: string, parentId: string | null, hasNewParent: boolean, isValidated: boolean = false): Promise<void> {

    if (!isValidated) {
      await this.validateParent(accountId, parentId);
    }

    return this.locationTreeTable.updateParent(accountId, id, parentId, hasNewParent);
  }
}

export { LocationService };
