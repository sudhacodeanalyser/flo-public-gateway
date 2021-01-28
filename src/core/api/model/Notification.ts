import * as t from 'io-ts';
import { AlertFeedbackFlow, Location, TimestampedModel } from '../../api';
import { convertEnumtoCodec } from '../enumUtils';
import { AlertFeedbackCodec } from './AlertFeedback'; // Necessary otherwise codec is undefined when imported form '../../api'

export interface AlarmListResult {
  items: Alarm[]
}

export interface Id<T> {
  id: T;
}

export interface AlarmDefaultSettings {
  systemMode: string;
  enabled: boolean;
}

export interface DeliveryMediumSettings {
  supported: boolean;
  defaultSettings: AlarmDefaultSettings[]
}

export interface DeliveryMediumConfig {
  userConfigurable: boolean;
  sms: DeliveryMediumSettings;
  email: DeliveryMediumSettings;
  push: DeliveryMediumSettings;
  call: DeliveryMediumSettings;
}

export enum FeedbackOptionType {
  LIST = 'list',
  CARD = 'card',
  ITEM = 'item'
}

export enum FeedbackAction {
  RESOLVE_INCIDENT = 'resolve-incident',
  SLEEP_DEVICE = 'sleep-device'
}

export interface FeedbackOptionIcon {
  tag: string;
  imageUrl: string;
}

export interface FeedbackOption {
  id: string;
  type: FeedbackOptionType;
  displayName?: string;
  displayTitle?: string;
  value: string;
  sortOrder?: number;
  sortRandom?: boolean;
  icon?: FeedbackOptionIcon;
  options: FeedbackOption[];
  optionsKey?: string;
}

export interface FeedbackOptions {
  id: string;
  feedback: FeedbackOption;
  optionsKeyList: FeedbackOption[];  
}

export interface Alarm {
  id: number;
  name: string;
  displayName: string;
  description: string;
  severity: number;
  isInternal: boolean;
  isShutoff: boolean;
  triggersAlarm?: TriggersAlarmResponse;
  userActions: UserActions;
  actions: Action[];
  supportOptions: SupportOption[];
  active: boolean;
  parent?: Id<number>;
  children: Array<Id<number>>;
  deliveryMedium: DeliveryMediumConfig;
  userFeedbackFlow?: AlertFeedbackFlow[];
  feedbackOptions?: FeedbackOptions;
}

export interface TriggersAlarmResponse {
  id: number
}

const {
  userId,
  createdAt,
  userFeedback
} = AlertFeedbackCodec.props;


export const UserFeedbackCodec = t.type({
  userId,
  createdAt,
  feedback: userFeedback
});

export type UserFeedback = t.TypeOf<typeof UserFeedbackCodec>;

export interface AlarmEvent {
  id: string;
  alarm: SimpleAlarm,
  deviceId: string;
  status: number;
  snoozeTo?: string;
  locationId: string;
  systemMode: string;
  resolutionDate?: string;
  userFeedback?: UserFeedback[];
  feedback?: NewUserFeedbackResponse;
  location?: Partial<Location>;
  createAt: string;
  updateAt: string;
}

export interface AlarmEventFilter {
  accountId?: string;
  groupId?: string;
  locationId?: string[];
  deviceId?: string[];
  status?: string[];
  severity?: string[];
  alarmId?: number[];
  reason?: string[];
  createdAt?: string[];
  isInternalAlarm?: boolean;
  lang?: string;
  unitSystem?: string;
  page?: number;
  size?: number;
}

export interface StatsFilter {
  locationIds?: string[];
  deviceIds?: string[]
}

export interface SimpleAlarm {
  id: number;
  name: string;
  description: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ClearAlertResponse {
  cleared: number;
}

export const ClearAlertBodyCodec = t.intersection([
  t.type({
    snoozeSeconds: t.number,
    alarmIds: t.array(t.Int)
  }),
  t.union([
    t.type({
      deviceId: t.string
    }),
    t.type({
      locationId: t.string
    })
  ])
]);

export type ClearAlertBody = t.TypeOf<typeof ClearAlertBodyCodec>;

export const AlarmSettingsCodec = t.type({
  alarmId: t.number,
  systemMode: t.string,
  smsEnabled: t.union([t.boolean, t.undefined]),
  emailEnabled: t.union([t.boolean, t.undefined]),
  pushEnabled: t.union([t.boolean, t.undefined]),
  callEnabled: t.union([t.boolean, t.undefined]),
  isMuted: t.union([t.boolean, t.undefined])
});

export const DeviceAlarmSettingsCodec = t.type({
  deviceId: t.string,
  smallDripSensitivity: t.union([t.number, t.undefined]),
  floSenseLevel: t.union([t.number, t.undefined]),
  settings: t.union([t.array(AlarmSettingsCodec), t.undefined]),
  userDefined: t.union([t.array(AlarmSettingsCodec), t.undefined])
});

export const LocationAlarmSettingsCodec = t.type({
  locationId: t.string,
  settings: t.union([t.array(AlarmSettingsCodec), t.undefined]),
  userDefined: t.union([t.array(AlarmSettingsCodec), t.undefined])
});

export const EntityAlarmSettingsItemCodec = t.union([DeviceAlarmSettingsCodec, LocationAlarmSettingsCodec]);

export const EntityAlarmSettingsCodec = t.type({
  items: t.array(EntityAlarmSettingsItemCodec)
});

export const UpdateAlarmSettingsCodec = t.intersection([
  t.type({
    items: t.array(EntityAlarmSettingsItemCodec)
  }),
  t.partial({
    accountType: t.string
  })
]);

export const RetrieveAlarmSettingsFilterCodec = t.intersection([
  t.partial({
    accountType: t.string
  }),
  t.union([
    t.type({
      deviceIds: t.array(t.string)
    }),
    t.type({
      locationIds: t.array(t.string)
    })
  ])
]);

export interface AlarmSettings extends t.TypeOf<typeof AlarmSettingsCodec> {}

export interface UpdateAlarmSettings extends t.TypeOf<typeof UpdateAlarmSettingsCodec> {}

export interface DeviceAlarmSettings extends t.TypeOf<typeof DeviceAlarmSettingsCodec> {}

export interface LocationAlarmSettings extends t.TypeOf<typeof LocationAlarmSettingsCodec> {}

export interface EntityAlarmSettings extends t.TypeOf<typeof EntityAlarmSettingsCodec> {}

export type EntityAlarmSettingsItem = t.TypeOf<typeof EntityAlarmSettingsItemCodec>

export type RetrieveAlarmSettingsFilter = t.TypeOf<typeof RetrieveAlarmSettingsFilterCodec>

export interface UserActions {
  displayTitle: string;
  displayDescription: string;
  actions: Action[];
}

export interface Action {
  id: number;
  name: string;
  text: string;
  displayOnStatus: number;
  sort: number;
}

export interface SupportOption {
  id: number;
  alarmId: number;
  actionPath: string;
  actionType: number;
  sort: number;
  text: string;
}

interface DeviceStats {
  count: number;
  absolute: number;
}

export interface Stats {
  count: number;
  devices: DeviceStats
}

export interface NotificationCounts {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  info: Stats;
  warning: Stats;
  critical: Stats;
}

export interface NotificationStatistics {
  pending: NotificationCounts
}

export enum AlertStatus {
  TRIGGERED = 'triggered',
  RESOLVED = 'resolved'
}

export const AlertStatusCodec = convertEnumtoCodec(AlertStatus);

export enum AlarmSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export const AlarmSeverityCodec = convertEnumtoCodec(AlarmSeverity);

export enum IncidentStatusReason {
  CLEARED = 'cleared',
  SNOOZED = 'snoozed',
  CANCELLED = 'cancelled'
}

export const IncidentStatusReasonCodec = convertEnumtoCodec(IncidentStatusReason);

export const SendWithUsEventCodec = t.type({
  category: t.unknown,
  email: t.string,
  event: t.string,
  receipt_id: t.string,
  send_at: t.number,
  sg_event_id:t.string,
  sg_message_id: t.string,
  'smtp-id': t.string,
  swu_template_id: t.string,
  swu_template_version_id: t.string,
  timestamp: t.number
});

export interface SendWithUsEvent extends t.TypeOf<typeof SendWithUsEventCodec> {}

export const ReceiptCodec = t.type({
  receipt_id: t.string, // TODO: We need to use snake case because the client uses it
  email: t.unknown
});

export interface Receipt extends t.TypeOf<typeof ReceiptCodec> {}

export const ServiceEventParamsCodec = t.type({
  incidentId: t.string,
  userId: t.string
});


export const TwilioStatusEventCodec = t.type({
  From: t.string,
  MessageSid: t.string,
  SmsStatus: t.string,
  SmsSid: t.string,
  ApiVersion: t.string,
  AccountSid: t.string,
  MessageStatus: t.string,
  To: t.string,
  ErrorCode: t.union([t.string, t.undefined])
});

export interface TwilioStatusEvent extends t.TypeOf<typeof TwilioStatusEventCodec> {}

export interface TwilioVoiceCallStatusEvent {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  ApiVersion: string;
  Direction: string;
  ForwardedFrom?: string;
  CallerName?: string;
  ParentCallSid?: string;
}


enum FilterStateType {
  SNOOZE = 'snooze',
  MAX_FREQUENCY_CAP = 'max-frequency-cap'
}

const FilterStateTypeCodec = convertEnumtoCodec(FilterStateType)

export const FilterStateCodec = t.type({
  id: t.union([t.string, t.undefined]),
  alarmId: t.number,
  type: FilterStateTypeCodec,
  deviceId: t.union([t.string, t.undefined]),
  locationId: t.union([t.string, t.undefined]),
  userId: t.union([t.string, t.undefined]),
  incidentId: t.union([t.string, t.undefined]),
  expiration: t.string,
  createdAt: t.union([t.string, t.undefined])
});

export interface FilterState extends t.TypeOf<typeof FilterStateCodec> {}

export const NewUserFeedbackRequestCodec = t.type({
  options: t.array(t.type({
    id: t.string,
    value: t.string
  }))
});

export interface NewUserFeedbackRequest extends t.TypeOf<typeof NewUserFeedbackRequestCodec> {}

export const NewUserFeedbackCodec = t.intersection([
  NewUserFeedbackRequestCodec,
  t.type({
    userId: t.string
  })
]);

export interface NewUserFeedback extends t.TypeOf<typeof NewUserFeedbackCodec> {}

export const NewUserFeedbackResponseCodec = t.intersection([
  NewUserFeedbackCodec,
  t.type({
    displayTitle: t.string,
    displaySummary: t.string,
    createdAt: t.union([t.string, t.undefined]),
    updatedAt: t.union([t.string, t.undefined])
  })
]);

export interface NewUserFeedbackResponse extends t.TypeOf<typeof NewUserFeedbackResponseCodec> {}

enum AlertReportOperator {
  AND = 'and',
  OR = 'or'
}
const AlertReportOperatorCodec = convertEnumtoCodec(AlertReportOperator);

enum MatchType {
  PREFIX = 'prefix',
  INFIX = 'infix',
  SUFFIX = 'suffix',
  EXACT = 'exact'
}
const MatchTypeCodec = convertEnumtoCodec(MatchType);

const QueryFilterCodec = t.type({
  query: t.type({
    text: t.string,
    matchType: MatchTypeCodec,
    properties: t.array(t.string)
  })  
});

export interface QueryFilter extends t.TypeOf<typeof QueryFilterCodec> {}

const PropertyFilterCodec = t.type({
  property: t.type({
    name: t.string,
    values: t.array(t.string)
  })
});

export interface PropertyFilter extends t.TypeOf<typeof PropertyFilterCodec> {}

const AlertReportBasicFiltersCodec = t.type({
  filters: t.type({
    operator: t.union([t.undefined, AlertReportOperatorCodec]),
    items: t.array(t.union([
      QueryFilterCodec,
      PropertyFilterCodec
    ]))
  })
});

const AlertReportSortCodec = t.type({
  property: t.string,
  valueOrder: t.union([t.undefined, t.array(t.string)]),
  direction: t.union([t.undefined, t.string])
});

const AlertReportViewCodec = t.partial({
  page: t.number,
  size: t.number
});

export const AlertReportDefinitionCodec = t.type({
  basic: AlertReportBasicFiltersCodec,
  sort: t.union([t.undefined, AlertReportSortCodec]),
  view: t.union([t.undefined, AlertReportViewCodec])
});

export interface AlertReportDefinition extends t.TypeOf<typeof AlertReportDefinitionCodec> {}
