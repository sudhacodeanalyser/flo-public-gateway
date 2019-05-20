import { inject, injectable } from 'inversify';
import { LocationResolver } from '../resolver';
import { Location, LocationUpdate, LocationUserRole } from '../api';

@injectable()
class LocationService {
  constructor(
    @inject('LocationResolver') private locationResolver: LocationResolver
  ) {}

  public async createLocation(location: Location): Promise<Location | {}> {
    const createdLocation: Location | null = await this.locationResolver.createLocation(location);

    return createdLocation === null ? {} : createdLocation;
  }

  public async getLocation(id: string, expand?: string[]): Promise<Location | {}> {
    const location: Location | null = await this.locationResolver.get(id, expand);

    return location === null ? {} : location;
  }

  public async updatePartialLocation(id: string, locationUpdate: LocationUpdate): Promise<Location> {
    return this.locationResolver.updatePartialLocation(id, locationUpdate);
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

export default LocationService;