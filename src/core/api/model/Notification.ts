import * as t from 'io-ts';
import { TimestampedModel, AlertFeedbackFlow } from '../../api';
import { AlertFeedbackCodec } from './AlertFeedback'; // Necessary otherwise codec is undefined when imported form '../../api'

export interface AlarmListResult {
  items: Alarm[]
}

export interface Id<T> {
  id: T;
}

type DeliveryMedium = 'sms' | 'push' | 'email' | 'call';

export interface AlarmDefaultSettings {
  systemMode: string;
  enabled: boolean;
}

export interface DeliveryMediumSettings {
  supported: boolean;
  defaultSettings: AlarmDefaultSettings[]
}

export interface Alarm {
  id: number;
  name: string;
  displayName: string;
  description: string;
  severity: number;
  isInternal: boolean;
  isShutoff: boolean;
  triggersAlarm?: TriggersAlarmResponse,
  actions: Action[];
  supportOptions: SupportOption[];
  active: boolean;
  parent?: Id<number>;
  children: Array<Id<number>>;
  deliveryMedium: Record<DeliveryMedium, DeliveryMediumSettings>;
  userFeedbackFlow?: AlertFeedbackFlow[];
}

export interface TriggersAlarmResponse {
  id: number
}

const {
  incidentId,
  alarmId,
  systemMode,
  deviceId,
  ...userFeedbackProps
} = AlertFeedbackCodec.props;


export const UserFeedbackCodec = t.type({ ...userFeedbackProps });
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

export const AlarmSettingsCodec = t.type({
  alarmId: t.number,
  systemMode: t.string,
  smsEnabled: t.union([t.boolean, t.undefined]),
  emailEnabled: t.union([t.boolean, t.undefined]),
  pushEnabled: t.union([t.boolean, t.undefined]),
  callEnabled: t.union([t.boolean, t.undefined])
});

export const DeviceAlarmSettingsCodec = t.type({
  deviceId: t.string,
  smallDripSensitivity: t.union([t.number, t.undefined]),
  settings: t.array(AlarmSettingsCodec)
});

export const UpdateDeviceAlarmSettingsCodec = t.type({
  items: t.array(DeviceAlarmSettingsCodec)
});

export interface AlarmSettings extends t.TypeOf<typeof AlarmSettingsCodec> {}

export interface UpdateDeviceAlarmSettings extends t.TypeOf<typeof UpdateDeviceAlarmSettingsCodec> {}

export interface DeviceAlarmSettings extends t.TypeOf<typeof DeviceAlarmSettingsCodec> {}

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
