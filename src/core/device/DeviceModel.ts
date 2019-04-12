import { Expandable, Timestamped, LocationModel } from '../api/models';

export enum DeviceType {
  FLO_DEVICE = 'flo_device',
  PUCK = 'puck'
}

export enum DeviceModelType {
  FLO_DEVICE_THREE_QUARTER_INCH = 'flo_device_3/4_inch',
  FLO_DEVICE_ONE_AND_QUARTER_INCH = 'flo_device_1_1/4_inch'
}

export interface DeviceModel extends Timestamped {
  id: string,
  macAddress: string,
  location: Expandable<LocationModel>,
  device_type: DeviceType,
  device_model: DeviceModelType,
  installation_point?: string,
  nickname?: string
}