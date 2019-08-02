import { ApiService } from '../ApiService';
import {
  Alarm,
  AlarmEvent, AlarmListResult,
  ClearAlertResponse,
  DeviceAlarmSettings,
  PaginatedResult, NotificationCounts, UpdateDeviceAlarmSettings
} from '../core/api';
import {Option, fromNullable} from 'fp-ts/lib/Option';

class ApiNotificationService {
  constructor(private notificationApi: ApiService) {}

  public async getAlarmById(id: string): Promise<Alarm> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/alarms/${id}`
    });
  }

  public async getAlarms(filters: string): Promise<AlarmListResult> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/alarms?${filters}`
    });
  }

  public async sendAlarm(alertInfo: any): Promise<string> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: '/events',
      body: alertInfo
    });
  }

  public async getAlarmEvent(id: string): Promise<AlarmEvent> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/events/${id}`
    });
  }

  public async deleteAlarmEvent(id: string): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'delete',
      url: `/events/${id}`
    });
  }

  public async getAlarmEventsByFilter(filters: string): Promise<PaginatedResult<AlarmEvent>> {
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

  public async updateAlarmSettings(userId: string, settings: UpdateDeviceAlarmSettings): Promise<void> {
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

  public async retrieveStatistics(filters: string): Promise<NotificationCounts> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/statistics?${filters}`
    });
  }
}

export { ApiNotificationService };
