import { fold, fromNullable, map, Option } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import _ from 'lodash';
import { ApiService } from '../ApiService';
import { Alarm, AlarmEvent, AlarmListResult, AlarmSettings, ClearAlertResponse, DeviceAlarmSettings, NotificationCounts, PaginatedResult, UpdateDeviceAlarmSettings } from '../core/api';

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
    const settingsArray = await this.getAlarmSettingsInBulk(userId, [deviceId]);

    return pipe(
      fromNullable(_.head(settingsArray)),
      map(settings => ({
        ...settings,
        smallDripSensitivity: this.calculateSmallDripSensitivity(settings)
      })
    ));
  }

  public async getAlarmSettingsInBulk(userId: string, deviceIds: string[]): Promise<DeviceAlarmSettings[]> {
    const devices = deviceIds.join(',');
    const settingsArray: DeviceAlarmSettings[] = await this.notificationApi.sendRequest({
      method: 'get',
      url: `/settings/${userId}?devices=${devices}`
    });

    return settingsArray.map(settings => ({
      ...settings,
      smallDripSensitivity: this.calculateSmallDripSensitivity(settings)
    }));
  }

  public async updateAlarmSettings(userId: string, settings: UpdateDeviceAlarmSettings): Promise<void> {
    const normalizedSettings = settings.items.map(s => this.normalizeDeviceAlarmSettings(userId, s));
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/settings/${userId}`,
      body: normalizedSettings
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

  // TODO: Improve this insanity (from here up to the end of file).
  private calculateSmallDripSensitivity(deviceSettings: DeviceAlarmSettings): number {
    const alarmSettingsByAlarmId = _.groupBy(deviceSettings.settings, 'alarmId');

    const smallDripCat4 = alarmSettingsByAlarmId[31];
    if (this.isAnyMediumEnabled(smallDripCat4)) {
      return 4;
    }

    const smallDripCat3 = alarmSettingsByAlarmId[30];
    if (this.isAnyMediumEnabled(smallDripCat3)) {
      return 3;
    }

    const smallDripCat2 = alarmSettingsByAlarmId[29];
    if (this.isAnyMediumEnabled(smallDripCat2)) {
      return 2;
    }

    return 1;
  }

  private async normalizeDeviceAlarmSettings(userId: string, deviceSettings: DeviceAlarmSettings): Promise<DeviceAlarmSettings> {
    if (!deviceSettings.smallDripSensitivity) {
      return Promise.resolve(deviceSettings);
    }

    const hasSmallDripCat1Settings = _.some(deviceSettings.settings, (s) => s.alarmId === 28);
    const defaultSmallDripCat1Settings: AlarmSettings[] =
      hasSmallDripCat1Settings
      ? []
      : await this.getDefaultSmallDripCat1Settings(userId, deviceSettings.deviceId);

    return {
      deviceId: deviceSettings.deviceId,
      smallDripSensitivity: deviceSettings.smallDripSensitivity,
      settings: this.normalizeSmallDripSettings(_.concat(deviceSettings.settings, defaultSmallDripCat1Settings), deviceSettings.smallDripSensitivity)
    }
  }

  private async getDefaultSmallDripCat1Settings(userId: string, deviceId: string): Promise<AlarmSettings[]> {
    const maybeAlarmSettings = await this.getAlarmSettings(userId, deviceId);
    return pipe(
      maybeAlarmSettings,
      fold(
        async () => this.getAlarmSettingsFromAlarm(await this.getAlarmById('28')),
        (s) => Promise.resolve(s.settings)
      )
    );
  }

  private getAlarmSettingsFromAlarm(alarm: Alarm): AlarmSettings[] {

    const callSettings = _.chain(alarm.deliveryMedium.call.defaultSettings)
      .keyBy('systemMode')
      .mapValues(v => alarm.deliveryMedium.call.supported && v.enabled)
      .value();
    const emailSettings = _.chain(alarm.deliveryMedium.email.defaultSettings)
      .keyBy('systemMode')
      .mapValues(v => alarm.deliveryMedium.email.supported && v.enabled)
      .value();
    const pushSettings =  _.chain(alarm.deliveryMedium.push.defaultSettings)
      .keyBy('systemMode')
      .mapValues(v => alarm.deliveryMedium.push.supported && v.enabled)
      .value();
    const smsSettings = _.chain(alarm.deliveryMedium.sms.defaultSettings)
      .keyBy('systemMode')
      .mapValues(v => alarm.deliveryMedium.sms.supported && v.enabled)
      .value();

    const systemModes = _.concat(_.keys(callSettings), _.keys(emailSettings), _.keys(pushSettings), _.keys(smsSettings))

    return systemModes.map(systemMode => ({
      alarmId: alarm.id,
      systemMode,
      smsEnabled: smsSettings[systemMode],
      emailEnabled: emailSettings[systemMode],
      pushEnabled: pushSettings[systemMode],
      callEnabled: callSettings[systemMode]
    }));
  }

  private normalizeSmallDripSettings(alarmSettings: AlarmSettings[], smallDripSensitivity: number): AlarmSettings[] {
    const alarmSettingsByAlarmId = _.groupBy(alarmSettings, 'alarmId');

    switch (Math.min(Math.max(1, smallDripSensitivity), 4)) {
      case 1:
        return alarmSettings.map(s => {
          if (s.alarmId !== 29 && s.alarmId !== 30 && s.alarmId !== 31) {
            return s;
          }
          return {
            ...s,
            smsEnabled: false,
            emailEnabled: false,
            pushEnabled: false,
            callEnabled: false
          }
        });

      case 2:
        return alarmSettings.map(s => {
          if (s.alarmId === 29) {
            return _.find(alarmSettingsByAlarmId[28], (smallDripCat1Settings) =>
              smallDripCat1Settings.systemMode === s.systemMode
            ) || s;
          }
          if (s.alarmId === 30 || s.alarmId === 31) {
            return {
              ...s,
              smsEnabled: false,
              emailEnabled: false,
              pushEnabled: false,
              callEnabled: false
            }
          }
          return s;
        });

      case 3:
        return alarmSettings.map(s => {
          if (s.alarmId === 29 || s.alarmId === 30) {
            return _.find(alarmSettingsByAlarmId[28], (smallDripCat1Settings) =>
              smallDripCat1Settings.systemMode === s.systemMode
            ) || s;
          }
          if (s.alarmId === 31) {
            return {
              ...s,
              smsEnabled: false,
              emailEnabled: false,
              pushEnabled: false,
              callEnabled: false
            }
          }
          return s;
        });

      case 4:
        return alarmSettings.map(s => {
          if (s.alarmId !== 29 && s.alarmId !== 30 && s.alarmId !== 31) {
            return s;
          }

          return _.find(alarmSettingsByAlarmId[28], (smallDripCat1Settings) =>
              smallDripCat1Settings.systemMode === s.systemMode
            ) || s;
        });

      default:
        return alarmSettings;
    }
  }

  private isAnyMediumEnabled(alarmSettings: AlarmSettings[]): boolean {
    return _.some(alarmSettings, (value) => value.callEnabled || value.emailEnabled ||
      value.pushEnabled || value.smsEnabled || false);
  }
}

export { ApiNotificationService };

