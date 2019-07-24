import { ApiService } from '../ApiService';
import {
  ActionsSupportResponse,
  AlertEvent,
  ClearAlertResponse,
  DeviceAlarmSettings,
  NotificationCounts,
  PaginatedResult
} from '../core/api';
import {Option, fromNullable} from 'fp-ts/lib/Option';

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

  public async getAlarmSettings(userId: string, deviceId: string): Promise<Option<DeviceAlarmSettings>> {
    const settings = await this.getAlarmSettingsInBulk(userId,[deviceId]);

    return fromNullable(settings[0]);
  }

  public async getAlarmSettingsInBulk(userId: string, deviceIds: string[]): Promise<DeviceAlarmSettings[]> {
    const devices = deviceIds.join(',');

    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/settings/${userId}?devices=${devices}`
    });
  }

  public async updateAlarmSettings(userId: string, settings: DeviceAlarmSettings[]): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/settings/${userId}`,
      body: settings
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

  public async getAlarmCounts(tbd: any): Promise<NotificationCounts> {
    return Promise.resolve({
      criticalCount: 12,
      warningCount: 9,
      infoCount: 3
    })
  }
}

export { ApiNotificationService };
