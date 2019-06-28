import {ApiService} from '../ApiService';
import {ActionsSupportResponse, AlertEvent, AlertSettings, ClearAlertResponse, PaginatedResult} from '../core/api';

class ApiNotificationService {
  constructor(private notificationApi: ApiService) {}

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

  public async clearAlarm(alarmId: string | number, data: any): Promise<ClearAlertResponse> {
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
    const query = icdId ? `?icdId=${icdId}` : '';

    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/settings/${userId}${query}`
    });
  }

  public async updateAlarmSettings(userId: string, data: any): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/settings/${userId}`,
      body: data
    });
  }

  public async generateEventsSample(data: any): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: '/events/sample',
      body: data
    });
  }

  public async getActions(data: any): Promise<ActionsSupportResponse> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: '/actions',
      body: data
    });
  }
}

export { ApiNotificationService };