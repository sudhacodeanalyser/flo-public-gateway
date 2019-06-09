import { inject, injectable } from 'inversify';
import { LocationResolver } from '../resolver';
import { DependencyFactoryFactory, Location, LocationUpdate, LocationUserRole, SystemMode as LocationSystemMode, DeviceSystemMode } from '../api';
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

  public async updatePartialLocation(id: string, locationUpdate: LocationUpdate, deviceSystemModeService: DeviceSystemModeService): Promise<Location> {
    const updatedLocation = await this.locationResolver.updatePartialLocation(id, locationUpdate);

    if (locationUpdate.systemMode) {
      const deviceSystemMode = locationUpdate.systemMode === LocationSystemMode.HOME ?
        DeviceSystemMode.HOME :
        DeviceSystemMode.AWAY;

      await Promise.all(
        updatedLocation.devices
          .map(device => 
            Promise.all([
              deviceSystemModeService.setSystemMode(device.id, deviceSystemMode),
              this.deviceServiceFactory().updatePartialDevice(device.id, {
                systemMode: {
                  target: deviceSystemMode,
                  shouldInherit: true
                }
              })
            ])
          )
      );
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

}

export { LocationService };