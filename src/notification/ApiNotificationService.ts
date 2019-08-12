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
    const normalizedSettings = await Promise.all(settings.items.map(async s =>
      this.normalizeDeviceAlarmSettings(userId, s))
    );
    return this.notificationApi.sendRequest({
      method: 'post',
      url: `/settings/${userId}`,
      body: {
        items: normalizedSettings
      }
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

    const defaultSmallDripCat1Settings: AlarmSettings[] = await this.getDefaultSmallDripCat1Settings(userId, deviceSettings);
    const missingSettings = this.getMissingSettings(deviceSettings.settings)

    return {
      deviceId: deviceSettings.deviceId,
      smallDripSensitivity: deviceSettings.smallDripSensitivity,
      settings: this.normalizeSmallDripSettings(_.concat(deviceSettings.settings, defaultSmallDripCat1Settings, missingSettings), deviceSettings.smallDripSensitivity)
    }
  }

  private async getDefaultSmallDripCat1Settings(userId: string, deviceSettings: DeviceAlarmSettings): Promise<AlarmSettings[]> {
    const smallDripCat1Settings = deviceSettings.settings.filter(s => s.alarmId === 28);
    if (smallDripCat1Settings.length === 3) {
      return Promise.resolve([]);
    }
    const maybeAlarmSettings = await this.getAlarmSettings(userId, deviceSettings.deviceId);
    const defaultSettings = await pipe(
      maybeAlarmSettings,
      fold(
        async () => this.getAlarmSettingsFromAlarm(await this.getAlarmById('28')),
        (alarmSettings) => Promise.resolve(alarmSettings.settings.filter(s => s.alarmId === 28))
      )
    );

    return defaultSettings
      .filter(s => !_.find(smallDripCat1Settings, ['systemMode', s.systemMode]));
  }

  private getMissingSettings(alarmSettings: AlarmSettings[]): AlarmSettings[] {
    const alarmSettingsByAlarmId: _.Dictionary<AlarmSettings[]> = _.groupBy(alarmSettings, 'alarmId');

    return _.concat(
      this.getMissingSettingsForAlarmId(alarmSettingsByAlarmId, 29),
      this.getMissingSettingsForAlarmId(alarmSettingsByAlarmId, 30),
      this.getMissingSettingsForAlarmId(alarmSettingsByAlarmId, 31)
    );
  }

  private getMissingSettingsForAlarmId(alarmSettingsByAlarmId: _.Dictionary<AlarmSettings[]>, alarmId: number): AlarmSettings[] {
    const allSystemModes = [ 'home', 'sleep', 'away' ];
    const systemModes = new Set((alarmSettingsByAlarmId[alarmId] || []).map(s => s.systemMode));
    return allSystemModes
      .filter(systemMode => !systemModes.has(systemMode))
      .reduce((missingSettings: AlarmSettings[], systemMode: string) => (
        missingSettings.concat(this.getDisabledSettingForSystemMode(alarmId, systemMode))
      ), []);
  }

  private getDisabledSettingForSystemMode(alarmId: number, systemMode: string): AlarmSettings {
    return {
      alarmId,
      systemMode,
      smsEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
      callEnabled: false
    }
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
            return {
              ...(_.find(alarmSettingsByAlarmId[28], ['systemMode', s.systemMode]) || s),
              alarmId: s.alarmId
            }
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
            return {
              ...(_.find(alarmSettingsByAlarmId[28], ['systemMode', s.systemMode]) || s),
              alarmId: s.alarmId
            }
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

          return {
            ...(_.find(alarmSettingsByAlarmId[28], ['systemMode', s.systemMode]) || s),
            alarmId: s.alarmId
          }
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

