import * as t from 'io-ts';
import { AlertFeedbackFlow, TimestampedModel } from '../../api';
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

export interface AlarmEvent extends TimestampedModel {
  id: string;
  alarm: SimpleAlarm,
  deviceId: string;
  status: number;
  snoozeTo?: string;
  locationId: string;
  systemMode: string;
  userFeedback?: UserFeedback[]
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
  settings: t.union([t.array(AlarmSettingsCodec), t.undefined])
});

export const UpdateDeviceAlarmSettingsCodec = t.type({
  items: t.array(DeviceAlarmSettingsCodec)
});

export interface AlarmSettings extends t.TypeOf<typeof AlarmSettingsCodec> {}

export interface UpdateDeviceAlarmSettings extends t.TypeOf<typeof UpdateDeviceAlarmSettingsCodec> {}

export interface DeviceAlarmSettings extends t.TypeOf<typeof DeviceAlarmSettingsCodec> {}

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

export interface NotificationCounts {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
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
  To: t.string
});

export interface TwilioStatusEvent extends t.TypeOf<typeof TwilioStatusEventCodec> {}
