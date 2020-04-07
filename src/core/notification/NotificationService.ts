import {
  Alarm,
  AlarmListResult,
  AlarmEvent,
  ClearAlertResponse,
  DeviceAlarmSettings,
  PaginatedResult,
  UpdateDeviceAlarmSettings,
  NotificationStatistics,
  Receipt,
  TwilioStatusEvent,
  SendWithUsEvent,
  FilterState
} from '../api';
import Request from '../api/Request';
import {Option} from 'fp-ts/lib/Option';

export interface NotificationServiceFactory {
  create(req: Request): NotificationService;
  createNoAuth(req: Request): UnAuthNotificationService;
}

export interface UnAuthNotificationService {
  registerSendgridEmailEvent(events: SendWithUsEvent[]): Promise<void>;
  registerEmailServiceEvent(incidentId: string, userId: string, receipt: Receipt): Promise<void>;
  registerSmsServiceEvent(incidentId: string, userId: string, event: TwilioStatusEvent): Promise<void>;
}

export interface NotificationService {
  getAlarmById(id: string, queryParams: any): Promise<Alarm>;
  getAlarms(queryParams: any): Promise<AlarmListResult>;
  sendAlarm(alertInfo: any): Promise<string>;
  getAlarmEvent(id: string): Promise<AlarmEvent>;
  deleteAlarmEvent(id: string): Promise<void>;
  getAlarmEventsByFilter(filters: string): Promise<PaginatedResult<AlarmEvent>>;
  clearAlarms(alarmIds: number[], data: any): Promise<ClearAlertResponse>;
  getAlarmSettings(userId: string, deviceId: string): Promise<Option<DeviceAlarmSettings>>;
  getAlarmSettingsInBulk(userId: string, deviceIds: string[]): Promise<DeviceAlarmSettings[]>;
  updateAlarmSettings(userId: string, settings: UpdateDeviceAlarmSettings): Promise<void>;
  generateEventsSample(data: any): Promise<void>;
  retrieveStatistics(filters: string): Promise<NotificationStatistics>;
  getFilterStateById(id: string): Promise<Option<FilterState>>;
  getFilterState(filters: any): Promise<FilterState[]>;
  deleteFilterState(id: string): Promise<void>;
  createFilterState(filterState: FilterState): Promise<FilterState>;
}
