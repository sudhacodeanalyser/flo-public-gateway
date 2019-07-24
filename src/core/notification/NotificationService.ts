import {
  ActionsSupportResponse,
  AlertEvent,
  ClearAlertResponse,
  DeviceAlarmSettings,
  NotificationCounts,
  PaginatedResult
} from '../api';
import Request from '../api/Request';
import {Option} from 'fp-ts/lib/Option';

export interface NotificationServiceFactory {
  create(req: Request): NotificationService;
}

export interface NotificationService {
  getDocs(): Promise<string>;
  sendAlert(alertInfo: any): Promise<string>;
  getAlertEvent(id: string): Promise<AlertEvent>;
  deleteAlertEvent(id: string): Promise<void>;
  getAlertEventsByFilter(filters: string): Promise<PaginatedResult<AlertEvent>>;
  clearAlarm(alarmId: string | number, data: any): Promise<ClearAlertResponse>;
  clearAlarms(data: any): Promise<ClearAlertResponse>;
  getAlarmSettings(userId: string, deviceId: string): Promise<Option<DeviceAlarmSettings>>;
  getAlarmSettingsInBulk(userId: string, deviceIds: string[]): Promise<DeviceAlarmSettings[]>;
  updateAlarmSettings(userId: string, settings: DeviceAlarmSettings[]): Promise<void>;
  generateEventsSample(data: any): Promise<void>;
  getActions(data: any): Promise<ActionsSupportResponse>;
  getAlarmCounts(data: any): Promise<NotificationCounts>;
}