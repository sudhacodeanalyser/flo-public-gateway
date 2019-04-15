import { inject, injectable, interfaces } from 'inversify';
import { LocationRecordData, LocationRecord } from './LocationRecord';
import { Location, LocationUser, DependencyFactoryFactory } from '../api/api';
import { DeviceResolver, LocationUserResolver } from '../resolver';
import LocationTable from '../location/LocationTable';

@injectable()
class LocationResolver {
  private deviceResolverFactory: () => DeviceResolver;
  private locationUserResolverFactory: () => LocationUserResolver;

  constructor(
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
    this.locationUserResolverFactory = depFactoryFactory<LocationUserResolver>('LocationUserResolver');
  }

  public async get(id: string, expandProps: string[] = []): Promise<Location | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(id);

    if (locationRecordData === null) {
      return null;
    }

    const locationRecord = new LocationRecord(locationRecordData);
    const locationId = locationRecord.data.location_id;
    const locationUsers = await this.locationUserResolverFactory().getAllByLocationId(locationId, expandProps);
    const devices = await this.deviceResolverFactory().getAllByLocationId(locationId);

    return {
      ...locationRecord.toModel(),
      users: locationUsers,
      devices
    };
  }
}

export { LocationResolver };