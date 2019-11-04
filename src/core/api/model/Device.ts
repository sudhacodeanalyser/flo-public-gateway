import * as t from 'io-ts';
import _ from 'lodash';
import { InternalConnectivity, InternalDeviceCodec, InternalTelemetry } from '../../../internal-device-service/models';
import { Expandable, Location, NotificationStatistics, Omit, SystemModeCodec as DeviceSystemModeCodec, TimestampedModel } from '../../api';
import { convertEnumtoCodec } from '../../api/enumUtils';
import { NonEmptyString } from '../../api/validator/NonEmptyString';
import { HealthTest } from '../../device/HealthTestService';
import { ComputedIrrigationSchedule } from '../../device/IrrigationScheduleService';

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
  FLO_DEVICE_V2 = 'flo_device_v2', // Defined for defaults
  PUCK = 'puck_oem'
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
  revertMode: t.union([t.undefined, DeviceSystemModeCodec]),
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
  area?: {
    id: string;
  }
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

export const PairingDataCodec = t.type({
  apName: t.string,
  loginToken: t.string,
  clientCert: t.string,
  clientKey: t.string,
  serverCert: t.string,
  websocketCert: t.union([t.undefined, t.string]),
  websocketCertDer: t.union([t.undefined, t.string]),
  websocketKey: t.string
});

export type PairingData = t.TypeOf<typeof PairingDataCodec>;

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
  notifications?: NotificationStatistics;
  hardwareThresholds?: HardwareThresholds;
  pairingData?: PairingData;
  serialNumber?: string;
  healthTest?: {
    latest?: HealthTest
  };
}

interface FwProperties {
  [prop: string]: any;
}

const {
  isConnected,
  lastHeardFromTime,
  fwVersion,
  fwProperties,
  floSense
} = InternalDeviceCodec.props;

export const AdditionalDevicePropsCodec  = t.type({
  isConnected,
  lastHeardFromTime,
  fwProperties,
  fwVersion,
  floSense
});

export interface AdditionalDeviceProps extends t.TypeOf<typeof AdditionalDevicePropsCodec> {}

export const DeviceActionRuleTypeUpsertCodec = t.type({
  action: NonEmptyString,
  event: NonEmptyString,
  targetDeviceId: NonEmptyString,
  order: t.number,
  enabled: t.boolean,
});

export const DeviceActionRulesCreateCodec = t.type({
  actionRules: t.array(DeviceActionRuleTypeUpsertCodec)
});

const DeviceActionsRuleTypeCodec = t.intersection([
  t.type({
    id: NonEmptyString
  }),
  DeviceActionRuleTypeUpsertCodec
]);

const DeviceActionRulesCodec = t.type({
  actionRules: t.array(DeviceActionsRuleTypeCodec)
});

export type DeviceActionRuleTypeUpsert = t.TypeOf<typeof DeviceActionRuleTypeUpsertCodec>;

export type DeviceActionRule = t.TypeOf<typeof DeviceActionsRuleTypeCodec>;

export type DeviceActionRulesCreate = t.TypeOf<typeof DeviceActionRulesCreateCodec>;

export type DeviceActionRules = t.TypeOf<typeof DeviceActionRulesCodec>;