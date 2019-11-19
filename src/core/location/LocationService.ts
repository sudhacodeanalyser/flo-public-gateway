import { fromNullable, isNone, Option } from 'fp-ts/lib/Option';
import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { AccessControlService } from '../../auth/AccessControlService';
import { Areas, DependencyFactoryFactory, Location, LocationUpdate, LocationUserRole, PropExpand, SystemMode } from '../api';
import ConflictError from '../api/error/ConflictError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import { DeviceSystemModeService } from '../device/DeviceSystemModeService';
import { IrrigationScheduleService, IrrigationScheduleServiceFactory } from '../device/IrrigationScheduleService';
import { LocationResolver } from '../resolver';
import { AccountService, DeviceService } from '../service';
import moment from 'moment';

@injectable()
class LocationService {
  private deviceServiceFactory: () => DeviceService;
  private accountServiceFactory: () => AccountService;
  private irrigationScheduleService: IrrigationScheduleService;

  constructor(
    @inject('LocationResolver') private locationResolver: LocationResolver,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('IrrigationScheduleServiceFactory') irrigationScheduleServiceFactory: IrrigationScheduleServiceFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext,
    @inject('AccessControlService') private accessControlService: AccessControlService
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.accountServiceFactory = depFactoryFactory<AccountService>('AccountService');

    if (!_.isEmpty(this.httpContext) && this.httpContext.request.get('Authorization')) {
      this.irrigationScheduleService = irrigationScheduleServiceFactory.create(this.httpContext.request);
    }
  }

  public async createLocation(location: Location): Promise<Option<Location>> {
    const createdLocation: Location | null = await this.locationResolver.createLocation(location);
    const accountId = location.account.id;
    const account = await this.accountServiceFactory().getAccountById(accountId);

    if (!isNone(account) && createdLocation !== null) {
      const ownerUserId = account.value.owner.id;
      await this.locationResolver.addLocationUserRole(createdLocation.id, ownerUserId, ['owner']);

      await this.refreshUserACL(ownerUserId);
    }

    return fromNullable(createdLocation);
  }

  public async getLocation(id: string, expand?: PropExpand): Promise<Option<Location>> {
    const location: Location | null = await this.locationResolver.get(id, expand);

    return fromNullable(location);
  }

  public async updatePartialLocation(id: string, locationUpdate: LocationUpdate): Promise<Location> {
    const updatedLocation = await this.locationResolver.updatePartialLocation(id, locationUpdate);

    if (!_.isEmpty(locationUpdate.irrigationSchedule) && !_.isEmpty(this.irrigationScheduleService)) {
      const deviceService = this.deviceServiceFactory();

      if (_.get(locationUpdate, 'irrigationSchedule.isEnabled', false)) {
         const devices = await deviceService.getAllByLocationId(id, { 
          $select: { 
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
        const devices = await deviceService.getAllByLocationId(id);
        const promises = devices
          .map(async (device) =>
            this.irrigationScheduleService.disableDeviceIrrigationAllowedInAwayMode(device.id)
          );

        await Promise.all(promises);
      }
    }

    return updatedLocation;
  }

  public async removeLocation(id: string): Promise<void> {
    return this.locationResolver.removeLocation(id);
  }

  public async getAllLocationUserRoles(locationId: string): Promise<LocationUserRole[]> {
   return this.locationResolver.getAllUserRolesByLocationId(locationId);
  }

  public async addLocationUserRole(locationId: string, userId: string, roles: string[]): Promise<LocationUserRole> {
    const locationUserRole = await this.locationResolver.addLocationUserRole(locationId, userId, roles);

    await this.refreshUserACL(userId);

    return locationUserRole;
  }

  public async removeLocationUserRole(locationId: string, userId: string): Promise<void> {
    await this.locationResolver.removeLocationUserRole(locationId, userId);

    const authToken = this.httpContext.request && this.httpContext.request.get('Authorization');

    if (authToken) {
      await this.accessControlService.refreshUser(authToken, userId);
    }
  }

  public async setSystemMode(id: string, deviceSystemModeService: DeviceSystemModeService, { target, revertMinutes, revertMode }: { target: SystemMode, revertMinutes?: number, revertMode?: SystemMode }): Promise<void> {
    const deviceService = this.deviceServiceFactory();
    const devices = await deviceService.getAllByLocationId(id);
    const unlockedDevices = devices.filter(({ systemMode }) => !(systemMode && systemMode.isLocked));

    if (devices.length && !unlockedDevices.length) {

      throw new ConflictError('All devices are in locked system mode state.');

    } else if (target === SystemMode.SLEEP) {
      const now = new Date().toISOString();
      const revertScheduledAt = moment(now).add(revertMinutes, 'minutes').toISOString();
      const promises = unlockedDevices
        .map(async device => {

          await deviceSystemModeService.sleep(device.id, revertMinutes || 0, revertMode || SystemMode.HOME);

          return deviceService.updatePartialDevice(device.id, {
            systemMode: {
              target,
              revertMinutes,
              revertMode,
              revertScheduledAt,
              shouldInherit: true
            }
          });
        });

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

          return deviceService.updatePartialDevice(device.id, {
            systemMode: {
              target,
              shouldInherit: true
            }
          });
        });

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

