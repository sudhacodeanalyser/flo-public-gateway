import {
  Alarm,
  AlarmListResult,
  AlarmEvent,
  ClearAlertResponse,
  DeviceAlarmSettings,
  PaginatedResult,
  UpdateAlarmSettings,
  NotificationStatistics,
  Receipt,
  TwilioStatusEvent,
  SendWithUsEvent,
  FilterState,
  AlarmEventFilter,
  NewUserFeedback,
  StatsFilter,
  EntityAlarmSettings,
  RetrieveAlarmSettingsFilter,
  TwilioVoiceCallStatusEvent
} from '../api';
import Request from '../api/Request';
import {Option} from 'fp-ts/lib/Option';

export interface UnAuthNotificationService {
  registerSendgridEmailEvent(events: SendWithUsEvent[]): Promise<void>;
  registerEmailServiceEvent(incidentId: string, userId: string, receipt: Receipt): Promise<void>;
  registerSmsServiceEvent(incidentId: string, userId: string, event: TwilioStatusEvent): Promise<void>;
  registerVoiceCallStatus(incidentId: string, userId: string, event: TwilioVoiceCallStatusEvent): Promise<void>;
}

export interface NotificationService {
  getAlarmById(id: string, queryParams: any): Promise<Alarm>;
  getAlarms(queryParams: any): Promise<AlarmListResult>;
  sendAlarm(alertInfo: any): Promise<string>;
  getAlarmEvent(id: string, queryParams?: Record<string, any>): Promise<AlarmEvent>;
  deleteAlarmEvent(id: string): Promise<void>;
  getAlarmEventsByFilter(filter: AlarmEventFilter): Promise<PaginatedResult<AlarmEvent>>;
  clearAlarms(alarmIds: number[], data: any): Promise<ClearAlertResponse>;
  getAlarmSettings(userId: string, filters: RetrieveAlarmSettingsFilter): Promise<EntityAlarmSettings>;
  updateAlarmSettings(userId: string, settings: UpdateAlarmSettings): Promise<void>;
  generateEventsSample(data: any): Promise<void>; 
  retrieveStatistics(filters: string): Promise<NotificationStatistics>;
  retrieveStatisticsInBatch(filter: StatsFilter): Promise<NotificationStatistics>;
  getFilterStateById(id: string): Promise<Option<FilterState>>;
  getFilterState(filters: any): Promise<FilterState[]>;
  deleteFilterState(id: string): Promise<void>;
  createFilterState(filterState: FilterState): Promise<FilterState>;
  saveUserFeedback(incidentId: string, userFeedback: NewUserFeedback, force?: boolean): Promise<void>
  moveEvents(srcAccountId: string, destAccountId: string, srcLocationId: string, destLocationId: string, deviceId: string): Promise<void>
}
