import { inject, injectable, multiInject } from 'inversify';
import _ from 'lodash';
import axios from "axios";
import {ApiRequest, ApiService} from "./ApiService";

// TODO: We need to move this types to other place

interface AlertEvent {
  id: string;
  alarm: SimpleAlarm,
  icdId: string;
  status: number;
  snoozeTo?: string;
  locationId: string;
  systemMode: string;
  updateAt: string;
  createAt: string;
}

interface SimpleAlarm {
  id: number;
  name: string;
  description: string;
}

interface PaginatedResult<T> {
  items: T[];
  page: string;
  total: number;
}

interface ClearAlertResponse {
  cleared: number;
}

interface AlertSettings {
  userId: string;
  icdId?: string;
  info?: GetAlarmConfig[];
  warning: GetAlarmConfig[];
  critical: GetAlarmConfig[];
}

interface GetAlarmConfig {
  alarmId: number;
  name: string;
  systemMode: number;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  callEnabled?: boolean;
}

interface ActionSupport {
  alarmId: number,
  actions: Action[],
  supportOptions: SupportOption[]
}

interface ActionsSupportResponse {
  items: ActionSupport[];
}

interface Action {
  id: number;
  name: string;
  text: string;
  displayOnStatus: number;
  sort: number;
}

interface SupportOption {
  id: number;
  alarmId: number;
  actionPath: string;
  actionType: number;
  sort: number;
  text: string;
}


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
      url: '/event',
      body: alertInfo
    });
  }

  public async getAlertEvent(id: string): Promise<AlertEvent> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/event/${id}`
    });
  }

  public async deleteAlertEvent(id: string): Promise<void> {
    return this.notificationApi.sendRequest({
      method: 'delete',
      url: `/event/${id}`
    });
  }

  public async getAlertEventsByFilter(filters: string): Promise<PaginatedResult<AlertEvent>> {
    return this.notificationApi.sendRequest({
      method: 'get',
      url: `/event?${filters}`
    });
  }

  public async clearAlarm(alarmId: number, data: any): Promise<ClearAlertResponse> {
    return this.notificationApi.sendRequest({
      method: 'put',
      url: `/alarm/${alarmId}/clear`,
      body: data
    });
  }

  public async clearAlarms(data: any): Promise<ClearAlertResponse> {
    return this.notificationApi.sendRequest({
      method: 'put',
      url: '/alarm/clear',
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