import { inject, injectable } from 'inversify';
import { DeviceRecordData, DeviceRecord } from './DeviceRecord';
import { Device, DependencyFactoryFactory, DeviceCreate } from '../api';
import { Resolver, PropertyResolverMap, LocationResolver } from '../resolver';
import { fromPartialRecord } from '../../database/Patch';
import DeviceTable from '../device/DeviceTable';
import uuid from 'uuid';

@injectable()
class DeviceResolver extends Resolver<Device> {
  protected propertyResolverMap: PropertyResolverMap<Device> = {
    location: async (device: Device, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      return this.locationResolverFactory().get(device.location.id);
    }
  };
  private locationResolverFactory: () => LocationResolver;

  constructor(
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
  }

  public async get(id: string, expandProps: string[] = []): Promise<Device | null> {
    const deviceRecordData: DeviceRecordData | null = await this.deviceTable.get({ id });

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getByMacAddress(macAddress: string, expandProps: string[] = []): Promise<Device | null> {
    const deviceRecordData = await this.deviceTable.getByMacAddress(macAddress);

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

  public async updatePartial(id: string, partialDevice: Partial<Device>): Promise<Device> {
    const deviceRecordData = DeviceRecord.fromPartialModel(partialDevice);
    const patch = fromPartialRecord<DeviceRecordData>(deviceRecordData);
    const updatedDeviceRecordData = await this.deviceTable.update({ id }, patch);

    return new DeviceRecord(updatedDeviceRecordData).toModel();
  }

  public async remove(id: string): Promise<void> {
    return this.deviceTable.remove({ id });
  }

  public async createDevice(deviceCreate: DeviceCreate, isPaired: boolean = false): Promise<Device> {
    const device = {
      ...deviceCreate,
      isPaired,
      id: uuid.v4()
    };
    const deviceRecordData = DeviceRecord.fromModel(device);
    const createdDeviceRecordData = await this.deviceTable.put(deviceRecordData);

    return new DeviceRecord(createdDeviceRecordData).toModel();
  }

  private async toModel(deviceRecordData: DeviceRecordData, expandProps: string[]): Promise<Device> {
    const device = new DeviceRecord(deviceRecordData).toModel();
    const expandedProps = await this.resolveProps(device, expandProps);

    return {
      ...device,
      ...expandedProps
    };
  }
}

export { DeviceResolver };