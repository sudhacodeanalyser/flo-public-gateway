import * as t from 'io-ts';
import { Expandable, TimestampedModel, Location } from '../../api';
import { $enum } from 'ts-enum-util';
import _ from 'lodash';

export enum DeviceType {
  FLO_DEVICE = 'flo_device',
  PUCK = 'puck'
}

export enum DeviceModelType {
  FLO_DEVICE_THREE_QUARTER_INCH = 'flo_device_3/4_inch',
  FLO_DEVICE_ONE_AND_QUARTER_INCH = 'flo_device_1_1/4_inch'
}

const deviceModelTypeValues = $enum(DeviceModelType).getValues();
const DeviceModelTypeCodec = t.keyof(
  _.zipObject(deviceModelTypeValues, deviceModelTypeValues.map(() => null)) as {
    [k in DeviceModelType]: null
  }
);
const deviceTypeValues = $enum(DeviceType).getValues();
const DeviceTypeCodec = t.keyof(
  _.zipObject(deviceTypeValues, deviceTypeValues.map(() => null)) as {
    [k in DeviceType]: null
  }
);

const DeviceMutableCodec = t.type({
  installationPoint: t.string,
  nickname: t.string
});

const DeviceCreateCodec = t.intersection([
  DeviceMutableCodec,
  t.type({
    macAddress: t.string,
    location: t.strict({ id: t.string }),
    deviceType: DeviceTypeCodec,
    deviceModel: DeviceModelTypeCodec
  })
]);

export const DeviceCreateValidator = t.exact(DeviceCreateCodec);
export type DeviceCreate = t.TypeOf<typeof DeviceCreateValidator>;
export const DeviceUpdateValidator = t.exact(t.partial(DeviceMutableCodec.props));
export type DeviceUpdate = t.TypeOf<typeof DeviceUpdateValidator>;

export interface Device extends DeviceUpdate, TimestampedModel {
  id: string,
  macAddress: string,
  location: Expandable<Location>,
  deviceType: DeviceType,
  deviceModel: DeviceModelType,
  isPaired: boolean
}