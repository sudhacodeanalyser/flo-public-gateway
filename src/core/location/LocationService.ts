import { inject, injectable } from 'inversify';
import { LocationResolver } from '../resolver';
import { DependencyFactoryFactory, Location, LocationUpdate, LocationUserRole, SystemMode, Account, PropExpand } from '../api';
import { DeviceSystemModeService } from '../device/DeviceSystemModeService';
import { DeviceService, AccountService } from '../service';
import { IrrigationScheduleService, IrrigationScheduleServiceFactory } from '../device/IrrigationScheduleService';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';

@injectable()
class LocationService {
  private deviceServiceFactory: () => DeviceService;
  private accountServiceFactory: () => AccountService;
  private irrigationScheduleService: IrrigationScheduleService;

  constructor(
    @inject('LocationResolver') private locationResolver: LocationResolver,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('IrrigationScheduleServiceFactory') irrigationScheduleServiceFactory: IrrigationScheduleServiceFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.accountServiceFactory = depFactoryFactory<AccountService>('AccountService');

    if (!_.isEmpty(this.httpContext)) {
      this.irrigationScheduleService = irrigationScheduleServiceFactory.create(this.httpContext.request);
    }
  }

  public async createLocation(location: Location): Promise<Location | {}> {
    const createdLocation: Location | null = await this.locationResolver.createLocation(location);
    const accountId = location.account.id;
    const account = await this.accountServiceFactory().getAccountById(accountId);

    if (!_.isEmpty(account) && createdLocation !== null) {
      const ownerUserId = (account as Account).owner.id;
      await this.locationResolver.addLocationUserRole(createdLocation.id, ownerUserId, ['owner']);
    }

    return createdLocation === null ? {} : createdLocation;
  }

  public async getLocation(id: string, expand?: PropExpand): Promise<Location | {}> {
    const location: Location | null = await this.locationResolver.get(id, expand);

    return location === null ? {} : location;
  }

  public async updatePartialLocation(id: string, locationUpdate: LocationUpdate): Promise<Location> {
    const updatedLocation = await this.locationResolver.updatePartialLocation(id, locationUpdate);

    if (!_.isEmpty(locationUpdate.irrigationSchedule) && !_.isEmpty(this.irrigationScheduleService)) {
      const deviceService = this.deviceServiceFactory();

      if (_.get(locationUpdate, 'irrigationSchedule.isEnabled', false)) {
         const devices = await deviceService.getAllByLocationId(id, ['irrigationSchedule']);
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
    return this.locationResolver.addLocationUserRole(locationId, userId, roles);
  }

  public async removeLocationUserRole(locationId: string, userId: string): Promise<void> {
    return this.locationResolver.removeLocationUserRole(locationId, userId);
  }

  public async setSystemMode(id: string, deviceSystemModeService: DeviceSystemModeService, { target, revertMinutes, revertMode }: { target: SystemMode, revertMinutes?: number, revertMode?: SystemMode }): Promise<void> {
    const deviceService = this.deviceServiceFactory();
    const devices = await deviceService.getAllByLocationId(id);

    if (target === SystemMode.SLEEP) {
      const now = new Date().toISOString();
      const promises = devices.map(device =>
        Promise.all([
          this.locationResolver.updatePartialLocation(id, {
            systemMode: {
              target,
              revertMinutes,
              revertMode,
              revertScheduledAt: now
            }
          }),
          deviceSystemModeService.sleep(device.id, revertMinutes || 0, revertMode || SystemMode.HOME),
          deviceService.updatePartialDevice(device.id, {
            systemMode: {
              target,
              revertMinutes,
              revertMode,
              revertScheduledAt: now,
              shouldInherit: true
            }
          })
        ])
      );

      await Promise.all(promises);
    } else {
      const promises = devices.map(device => 
        Promise.all([
          this.locationResolver.updatePartialLocation(id, {
            systemMode: {
              target
            }
          }),
          deviceSystemModeService.setSystemMode(device.id, target),
          deviceService.updatePartialDevice(device.id, {
            systemMode: {
              target,
              shouldInherit: true
            }
          })
        ])
      );

      await Promise.all(promises);
    }
  }
}

export { LocationService };