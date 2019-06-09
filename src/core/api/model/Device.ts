import * as t from 'io-ts';
import { InternalDevice } from '../../../internal-device-service/models';
import { Expandable, Location, TimestampedModel } from '../../api';
import { convertEnumtoCodec } from '../../api/enumUtils';
import { NoYesUnsure } from '../NoYesUnsure';

export enum DeviceSystemMode {
  HOME = 'home',
  AWAY = 'away',
  SLEEP = 'sleep'
}

export enum DeviceSystemModeNumeric {
  HOME = 2,
  AWAY = 3,
  SLEEP = 5
}

export const DeviceSystemModeCodec = convertEnumtoCodec(DeviceSystemMode);

export enum DeviceType {
  FLO_DEVICE = 'flo_device',
  PUCK = 'puck'
}

export enum DeviceModelType {
  FLO_DEVICE_THREE_QUARTER_INCH = 'flo_device_3/4_inch',
  FLO_DEVICE_ONE_AND_QUARTER_INCH = 'flo_device_1_1/4_inch'
}

export enum IrrigationType {
  NONE = 'none',
  SPRINKLERS = 'sprinklers',
  DRIP = 'drip'
}

const IrrigationTypeCodec = convertEnumtoCodec(IrrigationType);
const DeviceModelTypeCodec = convertEnumtoCodec(DeviceModelType);
const DeviceTypeCodec = convertEnumtoCodec(DeviceType);

const DeviceMutableCodec = t.type({
  installationPoint: t.string,
  nickname: t.string,
  prvInstalledAfter: NoYesUnsure.Codec,
  irrigationType: IrrigationTypeCodec
});

const MutableSystemModeCodec = t.type({
  shouldInherit: t.boolean,
  target: t.union([t.undefined, DeviceSystemModeCodec])
});

const SystemModeCodec = t.intersection([
  MutableSystemModeCodec,
  t.type({
    lastKnown: t.union([t.undefined, DeviceSystemModeCodec]),
    isLocked: t.boolean
  })
]);

const DeviceCreateCodec = t.intersection([
  t.partial(DeviceMutableCodec.props),
  t.type({
    macAddress: t.string,
    location: t.strict({ id: t.string })
  })
]);



export const DeviceCreateValidator = t.exact(DeviceCreateCodec);
export type DeviceCreate = t.TypeOf<typeof DeviceCreateValidator>;
export const DeviceUpdateValidator = t.exact(t.intersection([
  t.partial(DeviceMutableCodec.props),
  t.partial({
    systemMode: t.partial(MutableSystemModeCodec.props)
  })
]));
export type DeviceUpdate = t.TypeOf<typeof DeviceUpdateValidator>;

export interface Device extends DeviceUpdate, TimestampedModel {
  id: string,
  macAddress: string,
  location: Expandable<Location>,
  deviceType: DeviceType,
  deviceModel: DeviceModelType,
  isPaired: boolean,
  additionalProps: AdditionalDeviceProps | null | undefined
  systemMode: {
    lastKnown?: DeviceSystemMode,
    target?: DeviceSystemMode,
    shouldInherit: boolean,
    isLocked: boolean
  }
}

interface FwProperties {
  [prop: string]: any
}

export interface AdditionalDeviceProps extends Pick<InternalDevice, 'isConnected' | 'lastHeardFromTime' | 'fwVersion'> {
  fwProperties: FwProperties | null | undefined
}