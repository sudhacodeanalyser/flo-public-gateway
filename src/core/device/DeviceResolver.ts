import { inject, injectable } from 'inversify';
import { DeviceRecordData, DeviceRecord } from './DeviceRecord';
import { Device, DependencyFactoryFactory } from '../api';
import { Resolver, PropertyResolverMap, LocationResolver } from '../resolver';
import { fromPartialRecord } from '../../database/Patch';
import DeviceTable from '../device/DeviceTable';
import {InternalDeviceService} from "../../internal-device-service/InternalDeviceService";

@injectable()
class DeviceResolver extends Resolver<Device> {
  protected propertyResolverMap: PropertyResolverMap<Device> = {
    location: async (device: Device, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      return this.locationResolverFactory().get(device.location.id);
    },
    additionalProps: async (device: Device, shouldExpand = false) => {
      // tslint:disable
      console.log("device mac address is " + device.macAddress);
      return this.internalDeviceService.getDevice(device.macAddress);
    }
  };
  private locationResolverFactory: () => LocationResolver;

  constructor(
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
   @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService
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

    return this.toModel(updatedDeviceRecordData);
  }

  public async remove(id: string): Promise<void> {
    return this.deviceTable.remove({ id });
  }

  private async toModel(deviceRecordData: DeviceRecordData, expandProps: string[] = []): Promise<Device> {
    const device = new DeviceRecord(deviceRecordData).toModel();
    const expandedProps = await this.resolveProps(device, expandProps);

    return {
      ...device,
      ...expandedProps
    };
  }
}

export { DeviceResolver };