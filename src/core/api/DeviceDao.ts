import { inject, injectable, interfaces } from 'inversify';
import { DeviceRecordData, DeviceRecord } from '../device/DeviceRecord';
import { createFromFactory, ObjectExpander, Device, Location, LocationDao, DaoDependencyFactoryFactory } from './api';
import DeviceTable from '../device/DeviceTable';

@injectable()
class DeviceDao extends ObjectExpander<DeviceRecord, Device> {
  private locationDaoFactory: () => LocationDao;

  constructor(
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DaoDependencyFactoryFactory') daoDepFactoryFactory: DaoDependencyFactoryFactory
  ) {

    super({
      location: async (deviceRecord: DeviceRecord): Promise<Partial<Device>> => {
        const location: Location | null = await this.locationDaoFactory().get(deviceRecord.data.location_id);
  
        return location === null ? {} : { location };
      }
    });

    this.locationDaoFactory = daoDepFactoryFactory<LocationDao>('LocationDao');
  }

  public async get(id: string, expandProps: string[] = []): Promise<Device | null> {
    const deviceRecordData: DeviceRecordData | null = await this.deviceTable.get({ id });

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getAllByLocationId(locationId: string, expandProps: string[] = []): Promise<Device[]> {
    const deviceRecordData = await this.deviceTable.getAllByLocationId(locationId);

    return Promise.all(
      deviceRecordData.map(deviceRecordDatum => this.toModel(deviceRecordDatum, expandProps))
    );
  }

  private async toModel(deviceRecordData: DeviceRecordData, expandProps: string[]): Promise<Device> {
    const deviceRecord = new DeviceRecord(deviceRecordData);
    const expandedProps = await this.expandProps(deviceRecord, expandProps);

    return {
      ...deviceRecord.toModel(),
      ...expandedProps
    }; 
  }

}

export { DeviceDao };