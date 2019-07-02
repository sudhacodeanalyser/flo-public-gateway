import { ActionsSupportResponse, AlertEvent, AlertSettings, ClearAlertResponse, NotificationCounts, PaginatedResult } from '../api';
import Request from '../api/Request';

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
  getAlarmSettings(userId: string, icdId?: string): Promise<AlertSettings>;
  updateAlarmSettings(userId: string, data: any): Promise<void>;
  generateEventsSample(data: any): Promise<void>;
  getActions(data: any): Promise<ActionsSupportResponse>;
  getAlarmCounts(data: any): Promise<NotificationCounts>;
}