import { inject, injectable } from 'inversify';
import { LocationResolver, LocationUserResolver } from '../resolver';
import { Location, LocationUpdate, LocationUser } from '../api/api';

@injectable()
class LocationService {
  constructor(
    @inject('LocationResolver') private locationResolver: LocationResolver,
    @inject('LocationUserResolver') private locationUserResolver: LocationUserResolver
  ) {}

  public async createLocation(location: Location): Promise<Location> {
    return this.locationResolver.createLocation(location);
  }

  public async getLocation(id: string, expand?: string[]): Promise<Location | {}> {
    const location: Location | null = await this.locationResolver.get(id, expand);

    return location === null ? {} : location;
  }

  public async partiallyUpdateLocation(id: string, locationUpdate: LocationUpdate): Promise<Location> {
    return this.locationResolver.updatePartialLocation(id, locationUpdate);
  }

  public async removeLocation(id: string): Promise<void> {
    return this.locationResolver.removeLocation(id);
  }

  public async getAllLocationUsers(locationId: string, expand?: string[]): Promise<Pick<Location, 'users'>> {
    const locationUsers = await this.locationUserResolver.getAllByLocationId(locationId, expand);

    return {
      users: locationUsers
    };
  }

  public async addLocationUser(locationId: string, userId: string, roles: string[]): Promise<LocationUser> {
    const locationUsers = await this.locationUserResolver.addLocationUser(locationId, userId, roles);
    
    return locationUsers;
  }

  public async removeLocationUser(locationId: string, userId: string): Promise<void> {
    return this.locationUserResolver.removeLocationUser(locationId, userId);
  }
}

export default LocationService;