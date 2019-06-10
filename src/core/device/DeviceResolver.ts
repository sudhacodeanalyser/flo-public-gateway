import { inject, injectable } from 'inversify';
import uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { InternalDeviceService } from "../../internal-device-service/InternalDeviceService";
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceUpdate, DeviceModelType, DeviceType, DeviceSystemMode, DeviceSystemModeNumeric } from '../api';
import DeviceTable from '../device/DeviceTable';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import { DeviceRecord, DeviceRecordData } from './DeviceRecord';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import { translateNumericToStringEnum } from '../api/enumUtils';
import _ from 'lodash';

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
      return this.internalDeviceService.getDevice(device.macAddress);
    },
    systemMode: async (device: Device, shouldExpand = false) => {
      const [
        forcedSystemMode,
        additionalProperties
      ] = await Promise.all([
        this.deviceForcedSystemModeTable.getLatest(device.id),
        this.internalDeviceService.getDevice(device.macAddress)
      ]);

      return {
        ...device.systemMode,
        isLocked: forcedSystemMode !== null && forcedSystemMode.system_mode !== null,
        lastKnown: translateNumericToStringEnum(
          DeviceSystemMode, 
          DeviceSystemModeNumeric, 
          _.get(additionalProperties, 'fwProperties.system_mode')
        )
      };
    }
  };
  private locationResolverFactory: () => LocationResolver;

  constructor(
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
   @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
   @inject('DeviceForcedSystemModeTable') private deviceForcedSystemModeTable: DeviceForcedSystemModeTable
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

  public async updatePartial(id: string, deviceUpdate: DeviceUpdate): Promise<Device> {
    // tslint:disable
    console.log(JSON.stringify(deviceUpdate, null, 4));
    const deviceRecordData = DeviceRecord.fromPartialModel(deviceUpdate);
    console.log(JSON.stringify(deviceRecordData, null, 4));
    const patch = fromPartialRecord<DeviceRecordData>(deviceRecordData);
    const updatedDeviceRecordData = await this.deviceTable.update({ id }, patch);

    return this.toModel(updatedDeviceRecordData);
  }

  public async remove(id: string): Promise<void> {
    return this.deviceTable.remove({ id });
  }

  public async createDevice(deviceCreate: DeviceCreate, isPaired: boolean = false): Promise<Device> {
    const device = {
      ...deviceCreate,
      deviceType: DeviceType.FLO_DEVICE,
      deviceModel: DeviceModelType.FLO_DEVICE_THREE_QUARTER_INCH,
      additionalProps: null,
      isPaired,
      id: uuid.v4(),
      systemMode: {
        isLocked: false,
        shouldInherit: true
      }
    };
    const deviceRecordData = DeviceRecord.fromModel(device);
    const createdDeviceRecordData = await this.deviceTable.put(deviceRecordData);

    return new DeviceRecord(createdDeviceRecordData).toModel();
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
