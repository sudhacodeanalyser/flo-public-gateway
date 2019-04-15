import { inject, injectable, interfaces } from 'inversify';
import { LocationRecordData, LocationRecord } from './LocationRecord';
import { Location, LocationUser, DependencyFactoryFactory } from '../api/api';
import { Resolver,PropertyResolverMap, DeviceResolver, LocationUserResolver } from '../resolver';
import LocationTable from '../location/LocationTable';

@injectable()
class LocationResolver extends Resolver<Location> {
  protected propertyResolverMap: PropertyResolverMap<Location> = {
    devices: (model: Location, shouldExpand = false) => this.deviceResolverFactory().getAllByLocationId(model.id),
    users: (model: Location, shouldExpand = false) => this.locationUserResolverFactory().getAllByLocationId(model.id)
  }

  private deviceResolverFactory: () => DeviceResolver;
  private locationUserResolverFactory: () => LocationUserResolver;

  constructor(
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
    this.locationUserResolverFactory = depFactoryFactory<LocationUserResolver>('LocationUserResolver');
  }

  public async get(id: string, expandProps: string[] = []): Promise<Location | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(id);

    if (locationRecordData === null) {
      return null;
    }

    const location = new LocationRecord(locationRecordData).toModel();
    const resolvedProps = await this.resolveProps(location);

    return {
      ...location,
      ...resolvedProps
    };
  }
}

export { LocationResolver };