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

export interface AlertSettings {
  userId: string;
  icdId?: string;
  info?: GetAlarmConfig[];
  warning: GetAlarmConfig[];
  critical: GetAlarmConfig[];
}

export interface GetAlarmConfig {
  alarmId: number;
  name: string;
  systemMode: number;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  callEnabled?: boolean;
}

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
