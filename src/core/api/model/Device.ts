import * as t from 'io-ts';
import _ from 'lodash';
import { InternalConnectivity, InternalDeviceCodec, InternalTelemetry } from '../../../internal-device-service/models';
import { Expandable, Location, NotificationStatistics, Omit, SystemModeCodec as DeviceSystemModeCodec, TimestampedModel } from '../../api';
import { convertEnumtoCodec } from '../../api/enumUtils';
import { NonEmptyString } from '../../api/validator/NonEmptyString';
import { HealthTest } from '../../device/HealthTestService';
import { ComputedIrrigationSchedule } from '../../device/IrrigationScheduleService';
import { FormattedString } from '../../api/validator/FormattedString';
import { ArrayUpToLength } from '../../api/validator/ArrayUpToLength';

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
  }),
  area: t.type({
    id: t.string
  }),
  pes: t.record(t.string, t.any),
  floSense: t.record(t.string, t.any),
  audio: t.type({
    snoozeTo: t.string
  }),
  componentHealth: t.record(t.string, t.any)
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

const ThresholdDefinitionCodec = t.type({
  okMin: t.number,
  okMax: t.number,
  maxValue: t.number,
  minValue: t.number
});

export const HardwareThresholdsCodec = t.type({
  gpm: t.partial(ThresholdDefinitionCodec.props),
  psi: t.partial(ThresholdDefinitionCodec.props),
  lpm: t.partial(ThresholdDefinitionCodec.props),
  kPa: t.partial(ThresholdDefinitionCodec.props),
  tempF: t.partial(ThresholdDefinitionCodec.props),
  tempC: t.partial(ThresholdDefinitionCodec.props),
  battery: t.partial(ThresholdDefinitionCodec.props),
  humidity: t.partial(ThresholdDefinitionCodec.props),
  tempEnabled: t.union([t.undefined, t.boolean]),
  humidityEnabled: t.union([t.undefined, t.boolean]),
  batteryEnabled: t.union([t.undefined, t.boolean])
});

export type HardwareThresholds = t.TypeOf<typeof HardwareThresholdsCodec>;

const DeviceCreateCodec = t.type({
  macAddress: NonEmptyString,
  nickname: t.string,
  location: t.strict({ id: NonEmptyString }),
  deviceType: NonEmptyString,
  deviceModel: NonEmptyString,
  hardwareThresholds: t.union([t.undefined, t.exact(t.partial(HardwareThresholdsCodec.props))])
});
export const DeviceCreateValidator = t.exact(DeviceCreateCodec);
export type DeviceCreate = t.TypeOf<typeof DeviceCreateValidator>;

export const HealthTestTimeCodec = FormattedString((s: string) => {
  return /\d\d:\d\d/.test(s);
});

export const HealthTestAttemptTimesCodec = ArrayUpToLength(HealthTestTimeCodec, 3);

export const HealthTestTimeConfigCodec = t.union([
  t.type({
    scheduler: t.literal('disabled')
  }),
  t.type({
    scheduler: t.literal('manual'),
    times: HealthTestAttemptTimesCodec,
    timesPerDay: t.union([t.undefined, t.number])
  }),
  t.type({
    scheduler: t.literal('auto'),
    timesPerDay: t.union([t.undefined, t.number])
  })
]);

export type HealthTestTimeConfig = t.TypeOf<typeof HealthTestTimeConfigCodec>;

export const DeviceUpdateValidator = t.exact(t.intersection([
  t.partial(DeviceMutableCodec.props),
  t.partial({
    systemMode: t.partial({
      shouldInherit: MutableSystemModeCodec.props.shouldInherit
    })
  }),
  t.partial({
    puckConfig: t.type({
      isConfigured: t.literal(true)
    })
  }),
  t.partial({
    hardwareThresholds: t.exact(t.partial(HardwareThresholdsCodec.props))
  }),
  t.partial({
    healthTest: t.type({
      config: HealthTestTimeConfigCodec
    })
  })
]));

export interface DeviceUpdate extends t.TypeOf<typeof DeviceUpdateValidator> {
  systemMode?: Partial<SystemModeData>;
  area?: {
    id: string;
  };
}

export const DevicePairingDataCodec = t.type({
  apName: t.string,
  loginToken: t.string,
  clientCert: t.string,
  clientKey: t.string,
  serverCert: t.string,
  websocketCert: t.union([t.undefined, t.string]),
  websocketCertDer: t.union([t.undefined, t.string]),
  websocketKey: t.string
});

export const PuckPairingDataCodec = t.type({
  accessToken: t.string
});

export type PuckPairingData = t.TypeOf<typeof PuckPairingDataCodec>;

export const PairingDataCodec = t.union([
  DevicePairingDataCodec,
  PuckPairingDataCodec
]);

export type PairingData = t.TypeOf<typeof PairingDataCodec>;

interface Battery {
  level: number;
  updated?: string;
}

export interface Device extends Omit<DeviceUpdate, 'valve' | 'puckConfig' | 'audio' | 'healthTest'>, TimestampedModel {
  id: string;
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
  pairingData?: PairingData;
  serialNumber?: string;
  healthTest?: {
    latest?: HealthTest,
    config?: HealthTestTimeConfig
  };
  puckConfig?: {
    isConfigured: boolean;
    configuredAt?: string;
  };
  shutoff?: {
    scheduledAt: string;
  };
  actionRules?: DeviceActionRule[];
  battery?: Battery;
  audio?: {
    snoozeTo: string;
    snoozeSeconds?: number;
  };
  firmware?: FirmwareInfo;
}

export interface FirmwareInfo {
  current: {
    version: string;
  };
  latest: {
    version: string;
    sourceType: string;
    sourceLocation: string;
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
  id: t.union([t.undefined, NonEmptyString]),
  action: NonEmptyString,
  event: NonEmptyString,
  targetDeviceId: NonEmptyString,
  order: t.number,
  enabled: t.boolean
});

export const DeviceActionRulesCreateCodec = t.type({
  actionRules: t.array(DeviceActionRuleTypeUpsertCodec)
});

const DeviceActionsRuleTypeCodec = t.intersection([
  t.type({
    createdAt: NonEmptyString,
    updatedAt: NonEmptyString
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