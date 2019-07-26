import * as t from 'io-ts';
import _ from 'lodash';
import {InternalConnectivity, InternalDevice, InternalTelemetry, InternalDeviceCodec} from '../../../internal-device-service/models';
import { Expandable, Location, NotificationCounts, Omit, SystemModeCodec as DeviceSystemModeCodec, TimestampedModel } from '../../api';
import { NonEmptyString } from '../../api/validator/NonEmptyString';
import { convertEnumtoCodec } from '../../api/enumUtils';
import { ComputedIrrigationSchedule } from '../../device/IrrigationScheduleService';
import { NoYesUnsure } from '../NoYesUnsure';

export enum ValveState {
  OPEN = 'open',
  CLOSED = 'closed',
  IN_TRANSITION = 'inTransition'
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
  installationPoint: NonEmptyString,
  nickname: t.string,
  prvInstallation: NonEmptyString,
  irrigationType: NonEmptyString,
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
  macAddress: NonEmptyString,
  nickname: t.string,
  location: t.strict({ id: NonEmptyString }),
  deviceType: NonEmptyString,
  deviceModel: NonEmptyString
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
}

interface ThresholdDefinition {
  okMin: number;
  okMax: number;
  maxValue: number;
  minValue: number;
}

interface HardwareThresholds {
  gpm: ThresholdDefinition;
  psi: ThresholdDefinition;
  temp: ThresholdDefinition;
}

export interface PairingData {
  apName: string;
  loginToken: string;
  clientCert: string;
  clientKey: string;
  serverCert: string;
  websocketCert?: string;
  websocketCertDer?: string;
  websocketKey: string;  
}

export interface Device extends Omit<DeviceUpdate, 'valve'>, TimestampedModel {
  id: string,
  macAddress: string;
  location: Expandable<Location>;
  deviceType: string;
  deviceModel: string;
  isPaired: boolean;
  additionalProps: AdditionalDeviceProps | null | undefined;
  installStatus: {
    isInstalled: boolean,
    installDate?: string
  };
  learning?: {
    outOfLearningDate?: string
  };
  valve?: {
    target?: ValveState,
    lastKnown?: ValveState
  };
  connectivity?: InternalConnectivity;
  telemetry?: InternalTelemetry;
  irrigationSchedule?: {
    isEnabled: boolean,
    computed?: Omit<ComputedIrrigationSchedule, 'macAddress'>,
    updatedAt?: string
  };
  notifications?: NotificationCounts;
  hardwareThresholds?: HardwareThresholds;
  pairingData?: PairingData;
  serialNumber?: string;
}

interface FwProperties {
  [prop: string]: any;
}

const {
  isConnected,
  lastHeardFromTime,
  fwVersion,
  fwProperties
} = InternalDeviceCodec.props;

export const AdditionalDevicePropsCodec  = t.type({
  isConnected,
  lastHeardFromTime,
  fwProperties,
  fwVersion
});

export interface AdditionalDeviceProps extends t.TypeOf<typeof AdditionalDevicePropsCodec> {}