import { inject, injectable } from 'inversify';
import { LocationResolver } from '../resolver';
import { DependencyFactoryFactory, Location, LocationUpdate, LocationUserRole, SystemMode } from '../api';
import { DeviceSystemModeService } from '../device/DeviceSystemModeService';
import { DeviceService } from '../service';

@injectable()
class LocationService {
  private deviceServiceFactory: () => DeviceService;

  constructor(
    @inject('LocationResolver') private locationResolver: LocationResolver,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
  }

  public async createLocation(location: Location): Promise<Location | {}> {
    const createdLocation: Location | null = await this.locationResolver.createLocation(location);

    return createdLocation === null ? {} : createdLocation;
  }

  public async getLocation(id: string, expand?: string[]): Promise<Location | {}> {
    const location: Location | null = await this.locationResolver.get(id, expand);

    return location === null ? {} : location;
  }

  public async updatePartialLocation(id: string, locationUpdate: LocationUpdate): Promise<Location> {
    const updatedLocation = await this.locationResolver.updatePartialLocation(id, locationUpdate);

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