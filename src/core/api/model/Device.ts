import * as t from 'io-ts';
import { Expandable, TimestampedModel, Location } from '../api';

export enum DeviceType {
  FLO_DEVICE = 'flo_device',
  PUCK = 'puck'
}

export enum DeviceModelType {
  FLO_DEVICE_THREE_QUARTER_INCH = 'flo_device_3/4_inch',
  FLO_DEVICE_ONE_AND_QUARTER_INCH = 'flo_device_1_1/4_inch'
}

const DeviceMutableCodec = t.type({
  installationPoint: t.string,
  nickname: t.string
});

export const DeviceUpdateValidator = t.exact(t.partial(DeviceMutableCodec.props));
export type DeviceUpdate = t.TypeOf<typeof DeviceUpdateValidator>;

export interface Device extends DeviceUpdate, TimestampedModel {
  id: string,
  macAddress: string,
  location: Expandable<Location>,
  deviceType: DeviceType,
  deviceModel: DeviceModelType
}