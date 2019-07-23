import * as t from 'io-ts';
import { TimestampedModel } from '../../api';

export interface AlertEvent extends TimestampedModel {
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
  page: string;
  total: number;
}

export interface ClearAlertResponse {
  cleared: number;
}

export const GetAlarmSettingsCodec = t.type({
  alarmId: t.number,
  name: t.string,
  systemMode: t.string,
  smsEnabled: t.union([t.boolean, t.undefined]),
  emailEnabled: t.union([t.boolean, t.undefined]),
  pushEnabled: t.union([t.boolean, t.undefined]),
  callEnabled: t.union([t.boolean, t.undefined])
});

export const GetDeviceAlarmSettingsCodec = t.type({
  id: t.string, // TODO: This is just needed to use then Expandable, can we avoid this?
  deviceId: t.string,
  info: t.array(GetAlarmSettingsCodec),
  warning: t.array(GetAlarmSettingsCodec),
  critical: t.array(GetAlarmSettingsCodec)
});

export interface GetDeviceAlarmSettings extends t.TypeOf<typeof GetDeviceAlarmSettingsCodec> {}

export interface ActionSupport {
  alarmId: number,
  actions: Action[],
  supportOptions: SupportOption[]
}

export interface ActionsSupportResponse {
  items: ActionSupport[];
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
