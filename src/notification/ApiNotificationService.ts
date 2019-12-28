import { fold, fromNullable, Option } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import _ from 'lodash';
import {
  Alarm,
  AlarmEvent,
  AlarmListResult,
  ClearAlertResponse,
  Device,
  DeviceAlarmSettings,
  NotificationStatistics,
  PaginatedResult, Receipt,
  TwilioStatusEvent,
  UpdateDeviceAlarmSettings
} from '../core/api';
import { DeviceService } from '../core/device/DeviceService';
import { HttpService } from '../http/HttpService';

class ApiNotificationService {
  constructor(
    private readonly deviceServiceFactory: () => DeviceService,
    private notificationApi: HttpService
  ) {}

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
    try {
      return await this.notificationApi.sendRequest({
        method: 'get',
        url: `/events?${filters}`
      });
    } catch (err) {
      if (err.statusCode === 404) {
        return {
          items: [],
          page: 0,
          pageSize: 0,
          total: 0
        };
      } else {
        throw err;
      }
    }
  }

  public async clearAlarm(alarmId: string | number, data: any): Promise<ClearAlertResponse> {
    const devices =  await this.getDevicesInfo(data);
    const requestBody = {
      locationId: data.locationId,
      devices: devices.map(device => ({ id: device.id, macAddress: device.macAddress })),
      snoozeSeconds: data.snoozeSeconds
    };

    return this.notificationApi.sendRequest({
      method: 'put',
      url: `/alarms/${alarmId}/clear`,
      body: requestBody
    });
  }

  public async getAlarmSettings(userId: string, deviceId: string): Promise<Option<DeviceAlarmSettings>> {
    const settingsArray = await this.getAlarmSettingsInBulk(userId, [deviceId]);

    return fromNullable(_.head(settingsArray));
  }

  public async getAlarmSettingsInBulk(userId: string, deviceIds: string[]): Promise<DeviceAlarmSettings[]> {
    const devices = deviceIds.join(',');
    const settings: DeviceAlarmSettings[] = await this.notificationApi.sendRequest({
      method: 'get',
      url: `/settings/${userId}?devices=${devices}`
    });

    return settings;
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

  public async retrieveStatistics(filters: string): Promise<NotificationStatistics> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/statistics?${filters}`
    });
  }

  public async registerEmailServiceEvent(incidentId: string, userId: string, receipt: Receipt): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/status/email/events/${incidentId}/${userId}`,
      body: receipt
    });
  }

  public async registerSendgridEmailEvent(events: any[]): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/status/email/sendgrid/events`,
      body: {
        events
      }
    });
  }

  public async registerSmsServiceEvent(incidentId: string, userId: string, event: TwilioStatusEvent): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/status/sms/events/${incidentId}/${userId}`,
      body: event
    });
  }

  private async getDevicesInfo(data: any): Promise<Array<Pick<Device, 'macAddress' | 'id'>>> {
    const hasLocationId = (obj: any): obj is { locationId: string } => {
      return obj.locationId !== undefined;
    };

    const hasDeviceId = (obj: any): obj is { deviceId: string } => {
      return obj.deviceId !== undefined;
    };

    if (hasLocationId(data)) {
      return this.deviceServiceFactory().getAllByLocationId(data.locationId, {
        $select: {
          macAddress: true,
          id: true
        }
      });
    } else if (hasDeviceId(data)) {
      return pipe(
        await this.deviceServiceFactory().getDeviceById(data.deviceId, {
          $select: {
            macAddress: true,
            id: true
          }
        }),
        fold(
          () => [],
          (device: Device) => [device]
        )
      );
    } else {
      return Promise.resolve([]);
    }
  }
}

export { ApiNotificationService };

