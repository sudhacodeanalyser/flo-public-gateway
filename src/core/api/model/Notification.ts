import * as t from 'io-ts';
import { TimestampedModel } from '../../api';

export interface AlarmListResult {
  items: Alarm[]
}

export interface Alarm {
  id: number;
  name: string;
  description: string;
  severity: number;
  isInternal: boolean;
  actions: Action[];
  supportOptions: SupportOption[];
  active: boolean;
}

export interface AlarmEvent extends TimestampedModel {
  id: string;
  alarm: SimpleAlarm,
  icdId: string;
  status: number;
  snoozeTo?: string;
  locationId: string;
  systemMode: string;
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
  name: t.union([t.string, t.undefined]),
  systemMode: t.string,
  smsEnabled: t.union([t.boolean, t.undefined]),
  emailEnabled: t.union([t.boolean, t.undefined]),
  pushEnabled: t.union([t.boolean, t.undefined]),
  callEnabled: t.union([t.boolean, t.undefined])
});

export const DeviceAlarmSettingsCodec = t.type({
  deviceId: t.string,
  info: t.array(AlarmSettingsCodec),
  warning: t.array(AlarmSettingsCodec),
  critical: t.array(AlarmSettingsCodec)
});

export const UpdateDeviceAlarmSettingsCodec = t.type({
  items: t.array(DeviceAlarmSettingsCodec)
});

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
