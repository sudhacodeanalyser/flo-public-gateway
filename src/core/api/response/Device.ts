import { AdditionalDeviceProps, Device as DeviceModel, Omit } from '../../api';

export interface DeviceResponse extends Omit<DeviceModel, 'additionalProps'>, AdditionalDeviceProps {
}

export class Device {
  public static fromModel(device: DeviceModel): DeviceResponse {
    const {additionalProps, ...deviceData} = device;

    return {
      ...additionalProps,
      ...deviceData
    } as any as DeviceResponse;
  }
}
