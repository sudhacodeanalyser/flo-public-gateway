import { inject, injectable } from 'inversify';
import { fold, fromNullable, Option } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as _ from 'lodash';
import {
  Alarm,
  AlarmEvent,
  AlarmListResult,
  ClearAlertResponse,
  Device,
  DeviceAlarmSettings,
  NotificationStatistics,
  PaginatedResult, Receipt, SendWithUsEvent,
  TwilioStatusEvent,
  UpdateAlarmSettings,
  FilterState,
  AlarmEventFilter,
  NewUserFeedback,
  StatsFilter,
  RetrieveAlarmSettingsFilter,
  EntityAlarmSettings,
  DependencyFactoryFactory,
  TwilioVoiceCallStatusEvent
} from '../core/api';
import { DeviceService } from '../core/device/DeviceService';
import { HttpService } from '../http/HttpService';

@injectable()
class ApiNotificationService extends HttpService {
  private deviceServiceFactory: () => DeviceService;
  
  constructor(
    @inject('notificationApiUrl') private readonly notificationApiUrl: string,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();
    this.baseUrl = this.notificationApiUrl;
    this.authToken = this.httpContext && this.httpContext.request && this.httpContext.request.get('Authorization');
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
  }

  public async getAlarmById(id: string, queryParams: any): Promise<Alarm> {
    return this.sendRequest({
      method: 'get',
      url: `/alarms/${id}`,
      params: queryParams
    });
  }

  public async getAlarms(queryParams: any): Promise<AlarmListResult> {
    return this.sendRequest({
      method: 'get',
      url: `/alarms`,
      params: queryParams
    });
  }

  public async sendAlarm(alertInfo: any): Promise<string> {
    return this.sendRequest({
      method: 'post',
      url: '/events',
      body: alertInfo
    });
  }

  public async getAlarmEvent(id: string, queryParams?: Record<string, any>): Promise<AlarmEvent> {
    return this.sendRequest({
      method: 'get',
      url: `/events/${id}`,
      params: queryParams
    });
  }

  public async deleteAlarmEvent(id: string): Promise<void> {
    return this.sendRequest({
      method: 'delete',
      url: `/events/${id}`
    });
  }

  public async getAlarmEventsByFilter(filters: AlarmEventFilter): Promise<PaginatedResult<AlarmEvent>> {
    try {
      return await this.sendRequest({
        method: 'post',
        url: `/events/batch`,
        body: filters
      });
    } catch (err: any) {
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

  public async clearAlarms(alarmIds: number[], data: any): Promise<ClearAlertResponse> {
    const devices =  await this.getDevicesInfo(data);
    const requestBody = {
      locationId: data.locationId,
      devices: devices.map(device => ({ id: device.id, macAddress: device.macAddress })),
      snoozeSeconds: data.snoozeSeconds,
      alarmIds
    };

    return this.sendRequest({
      method: 'put',
      url: `/alarms/clear`,
      body: requestBody
    });
  }

  public async getAlarmSettings(userId: string, filters: RetrieveAlarmSettingsFilter): Promise<EntityAlarmSettings> {    
    const settings: EntityAlarmSettings = await this.sendRequest({
      method: 'post',
      url: `/settings/${userId}/batch`,
      body: filters
    });

    return settings;
  }

  public async updateAlarmSettings(userId: string, settings: UpdateAlarmSettings): Promise<void> {
    return this.sendRequest({
      method: 'post',
      url: `/settings/${userId}`,
      body: settings
    });
  }

  public async generateEventsSample(data: any): Promise<void> {
    return this.sendRequest({
      method: 'post',
      url: '/events/sample',
      body: data
    });
  }

  public async retrieveStatistics(filters: string): Promise<NotificationStatistics> {
    return this.sendRequest({
      method: 'get',
      url: `/statistics?${filters}`
    });
  }

  public async retrieveStatisticsInBatch(filters: StatsFilter): Promise<NotificationStatistics> {
    return this.sendRequest({
      method: 'post',
      url: '/statistics/batch',
      body: filters
    });
  }

  public async getFilterStateById(id: string): Promise<Option<FilterState>> {
    return this.sendRequest({
      method: 'get',
      url: `/filters/${id}`
    });
  }

  public async getFilterState(filters: any): Promise<FilterState[]> {
    return this.sendRequest({
      method: 'get',
      url: '/filters',
      params: filters
    });
  }

  public async deleteFilterState(id: string): Promise<void> {
    return this.sendRequest({
      method: 'delete',
      url: `/filters/${id}`
    });
  }

  public async createFilterState(filterState: FilterState): Promise<FilterState> {
    return this.sendRequest({
      method: 'post',
      url: '/filters',
      body: filterState
    });
  }

  public async registerEmailServiceEvent(incidentId: string, userId: string, receipt: Receipt): Promise<void> {
    return this.sendRequest({
      method: 'post',
      url: `/email/events/${incidentId}/${userId}`,
      body: {
        receiptId: receipt.receipt_id
      }
    });
  }

  public async registerSendgridEmailEvent(events: SendWithUsEvent[]): Promise<void> {
    const formattedEvents = this
      .toLowerCamelCaseObject(events)
      .map((event: SendWithUsEvent) => ({
        ...event,
        category: JSON.stringify(event.category)
      }));

    return this.sendRequest({
      method: 'post',
      url: '/email/events',
      body: {
        events: formattedEvents
      }
    });
  }

  public async registerSmsServiceEvent(incidentId: string, userId: string, event: TwilioStatusEvent): Promise<void> {
    return this.sendRequest({
      method: 'post',
      url: `/sms/events/${incidentId}/${userId}`,
      body: this.toLowerCamelCaseObject(event)
    });
  }

  public async registerVoiceCallStatus(incidentId: string, userId: string, event: TwilioVoiceCallStatusEvent): Promise<void> {
    return this.sendRequest({
      method: 'post',
      url: `/voice/status/${incidentId}/${userId}`,
      body: {
        callStatus: event.CallStatus,
        data: this.toLowerCamelCaseObject(event)
      }
    });
  }

  public async saveUserFeedback(incidentId: string, userFeedback: NewUserFeedback, force?: boolean): Promise<void> {
    return this.sendRequest({
      method: 'put',
      url: `/alerts/${incidentId}/feedback`,
      params: {
        ...(force && { force })
      },
      body: userFeedback
    });
  }

  public async moveEvents(srcAccountId: string, destAccountId: string, srcLocationId: string, destLocationId: string, deviceId: string): Promise<void> {
    return this.sendRequest({
      method: 'put',
      url: '/events/move',
      body: {
        srcAccountId,
        destAccountId,
        srcLocationId,
        destLocationId,
        deviceId
      }
    })
  }

  private toLowerCamelCaseObject(obj: any): any {
    if(_.isArray(obj)) {
      return obj.map(x => this.toLowerCamelCaseObject(x))
    } else {
      return _.mapKeys(obj, (v, k) => _.camelCase(k))
    }
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
