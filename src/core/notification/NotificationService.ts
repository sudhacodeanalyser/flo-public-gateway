import {
  Alarm,
  AlarmEvent,
  ClearAlertResponse,
  DeviceAlarmSettings,
  NotificationCounts,
  PaginatedResult, UpdateDeviceAlarmSettings
} from '../api';
import Request from '../api/Request';
import {Option} from 'fp-ts/lib/Option';

export interface NotificationServiceFactory {
  create(req: Request): NotificationService;
}

export interface NotificationService {
  getAlarmById(id: string): Promise<Alarm>;
  getAlarms(): Promise<Alarm[]>;
  sendAlarm(alertInfo: any): Promise<string>;
  getAlarmEvent(id: string): Promise<AlarmEvent>;
  deleteAlarmEvent(id: string): Promise<void>;
  getAlarmEventsByFilter(filters: string): Promise<PaginatedResult<AlarmEvent>>;
  clearAlarm(alarmId: string | number, data: any): Promise<ClearAlertResponse>;
  clearAlarms(data: any): Promise<ClearAlertResponse>;
  getAlarmSettings(userId: string, deviceId: string): Promise<Option<DeviceAlarmSettings>>;
  getAlarmSettingsInBulk(userId: string, deviceIds: string[]): Promise<DeviceAlarmSettings[]>;
  updateAlarmSettings(userId: string, settings: UpdateDeviceAlarmSettings): Promise<void>;
  generateEventsSample(data: any): Promise<void>;
  getAlarmCounts(data: any): Promise<NotificationCounts>;
}