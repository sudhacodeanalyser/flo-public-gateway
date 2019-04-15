import { inject, injectable, interfaces } from 'inversify';
import { LocationRecordData, LocationRecord } from '../location/LocationRecord';
import { createFromFactory, LocationUserDao, DeviceDao, Location, LocationUser, DaoDependencyFactoryFactory } from './api';
import LocationTable from '../location/LocationTable';

@injectable()
class LocationDao {
  private deviceDaoFactory: () => DeviceDao;
  private locationUserDaoFactory: () => LocationUserDao;

  constructor(
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('DaoDependencyFactoryFactory') daoDepFactoryFactory: DaoDependencyFactoryFactory
  ) {
    this.deviceDaoFactory = daoDepFactoryFactory<DeviceDao>('DeviceDao');
    this.locationUserDaoFactory = daoDepFactoryFactory<LocationUserDao>('LocationUserDao');
  }

  public async get(id: string, expandProps: string[] = []): Promise<Location | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(id);

    if (locationRecordData === null) {
      return null;
    }

    const locationRecord = new LocationRecord(locationRecordData);
    const locationId = locationRecord.data.location_id;
    const locationUsers = await this.locationUserDaoFactory().getAllByLocationId(locationId, expandProps);
    const devices = await this.deviceDaoFactory().getAllByLocationId(locationId);

    return {
      ...locationRecord.toModel(),
      users: locationUsers,
      devices
    };
  }
}

export { LocationDao };