import * as t from 'io-ts';
import _ from 'lodash';
import { InternalDevice } from '../../../internal-device-service/models';
import { Expandable, Location, Omit, SystemModeCodec as DeviceSystemModeCodec, TimestampedModel } from '../../api';
import { convertEnumtoCodec } from '../../api/enumUtils';
import { ComputedIrrigationSchedule } from '../../device/IrrigationScheduleService';
import { NoYesUnsure } from '../NoYesUnsure';

export enum ValveState {
  OPEN = 'open',
  CLOSED = 'closed',
  IN_TRANSITION = 'in_transition'
}

export enum ValveStateNumeric {
  CLOSED = 0,
  OPEN = 1,
  IN_TRANSITION = 2
}

export const ValveStateCodec = convertEnumtoCodec(ValveState);

export enum DeviceSystemModeNumeric {
  HOME = 2,
  AWAY = 3,
  SLEEP = 5
}

export enum DeviceModelType {
  FLO_0_75 = 'flo_device_075_v2' // Defined for defaults
}

export enum DeviceType {
  FLO_DEVICE_V2 = 'flo_device_v2' // Defined for defaults
}

const DeviceMutableCodec = t.type({
  installationPoint: t.string,
  nickname: t.string,
  prvInstalledAfter: NoYesUnsure.Codec,
  irrigationType: t.string,
  valve: t.partial({
    target: t.keyof(_.pick(ValveStateCodec.keys, ['open', 'closed']))
  })
});

const MutableSystemModeCodec = t.type({
  shouldInherit: t.boolean,
  target: t.union([t.undefined, DeviceSystemModeCodec]),
  revertScheduledAt: t.union([t.undefined, t.string]),
  revertMode: t.union([t.undefined, t.string]),
  revertMinutes: t.union([t.undefined, t.number])
});

const SystemModeCodec = t.intersection([
  MutableSystemModeCodec,
  t.type({
    lastKnown: t.union([t.undefined, DeviceSystemModeCodec]),
    isLocked: t.boolean
  })
]);

type SystemModeData = t.TypeOf<typeof SystemModeCodec>;

const DeviceCreateCodec = t.type({
  macAddress: t.string,
  nickname: t.string,
  location: t.strict({ id: t.string }),
  deviceType: t.string,
  deviceModel: t.string
});
export const DeviceCreateValidator = t.exact(DeviceCreateCodec);
export type DeviceCreate = t.TypeOf<typeof DeviceCreateValidator>;

export const DeviceUpdateValidator = t.exact(t.intersection([
  t.partial(DeviceMutableCodec.props),
  t.partial({
    systemMode: t.partial({
      shouldInherit: MutableSystemModeCodec.props.shouldInherit
    })
  })
]));
export interface DeviceUpdate extends t.TypeOf<typeof DeviceUpdateValidator> {
  systemMode?: Partial<SystemModeData>;
};

export interface Device extends Omit<DeviceUpdate, 'valve'>, TimestampedModel {
  id: string,
  macAddress: string,
  location: Expandable<Location>,
  deviceType: string,
  deviceModel: string,
  isPaired: boolean,
  additionalProps: AdditionalDeviceProps | null | undefined,
  valve?: {
    target?: ValveState,
    lastKnown?: ValveState
  },
  irrigationSchedule?: {
    isEnabled: boolean,
    computed?: Omit<ComputedIrrigationSchedule, 'macAddress'>,
    updatedAt?: string
  },
  isInstalled?: boolean
}

interface FwProperties {
  [prop: string]: any;
}

export interface AdditionalDeviceProps extends Pick<InternalDevice, 'isConnected' | 'lastHeardFromTime' | 'fwVersion'> {
  fwProperties: FwProperties | null | undefined;
}