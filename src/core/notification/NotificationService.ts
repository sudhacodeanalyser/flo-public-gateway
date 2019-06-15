import { injectable } from 'inversify';
import {ApiService} from './ApiService';
import {ActionsSupportResponse, AlertEvent, AlertSettings, ClearAlertResponse, PaginatedResult} from '../api';

@injectable()
class NotificationService {
  constructor(private notificationApi: ApiService) {

  }

  public async getDocs(): Promise<string> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: '/docs'
    });
  }

  public async sendAlert(alertInfo: any): Promise<string> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: '/events',
      body: alertInfo
    });
  }

  public async getAlertEvent(id: string): Promise<AlertEvent> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/events/${id}`
    });
  }

  public async deleteAlertEvent(id: string): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'delete',
      url: `/events/${id}`
    });
  }

  public async getAlertEventsByFilter(filters: string): Promise<PaginatedResult<AlertEvent>> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/events?${filters}`
    });
  }

  public async clearAlarm(alarmId: number, data: any): Promise<ClearAlertResponse> {
    return this.notificationApi.sendRequest({
      method: 'put',
      url: `/alarms/${alarmId}/clear`,
      body: data
    });
  }

  public async clearAlarms(data: any): Promise<ClearAlertResponse> {
    return this.notificationApi.sendRequest({
      method: 'put',
      url: '/alarms/clear',
      body: data
    });
  }

  public async getAlarmSettings(userId: string, icdId?: string): Promise<AlertSettings> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/settings/${userId}?icdId=${icdId}`
    });
  }

  public async updateAlarmSettings(userId: string, data: any): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/settings/${userId}`,
      body: data
    });
  }

  public async generateRandomEvents(data: any): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/events/random`,
      body: data
    });
  }

  public async getActions(data: any): Promise<ActionsSupportResponse> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/events/random`,
      body: data
    });
  }
}

export { NotificationService };