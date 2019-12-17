import { AdditionalDeviceProps, Device as DeviceModel, Omit, Expandable } from '../../api';
import { Response, Location, LocationResponse } from './index';

export interface DeviceResponse extends Omit<Expandable<DeviceModel>, 'additionalProps' | 'location'>, Omit<Partial<AdditionalDeviceProps>, 'floSense'> {
  location?: LocationResponse
}

export class Device implements Response {
  public static fromModel(device: Expandable<DeviceModel>): DeviceResponse {
    const {additionalProps, ...deviceData} = device;

    return {
      ...additionalProps,
      ...deviceData,
      location: device.location && Location.fromModel(device.location)
    } as any as DeviceResponse;
  }
}
