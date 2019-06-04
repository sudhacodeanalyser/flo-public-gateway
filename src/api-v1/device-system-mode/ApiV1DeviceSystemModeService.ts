import { ApiV1Service } from '../ApiV1Service';
import { DeviceSystemModeServiceFactory, DeviceSystemModeService, SystemMode } from '../../core/device/DeviceSystemModeService';
import { translateStringToNumericEnum } from '../../core/api/enumUtils';

export enum SystemModeNumeric {
  HOME = 2,
  AWAY = 3,
  SLEEP = 5
}

class ApiV1DeviceSystemModeService extends ApiV1Service implements DeviceSystemModeService {

  constructor(
    private readonly apiV1Url: string,
    private readonly authToken: string
  ) {
    super();
  }

  public async setSystemMode(id: string, systemMode: SystemMode): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/setsystemmode`,
      authToken: this.authToken,
      body: {
        system_mode: translateStringToNumericEnum(SystemModeNumeric, SystemMode, systemMode)
      }
    };

    await this.sendRequest(request);
  }

  public async sleep(id: string, sleepMinutes: number, wakeUpSystemMode: SystemMode): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/sleep`,
      authToken: this.authToken,
      body: {
        sleep_minutes: sleepMinutes,
        wake_up_system_mode: translateStringToNumericEnum(SystemModeNumeric, SystemMode, wakeUpSystemMode)
      }
    };

    await this.sendRequest(request);
  }

  public async enableForcedSleep(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/forcedsleep/enable`,
      authToken: this.authToken
    };

    await this.sendRequest(request);
  }

  public async disableForcedSleep(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/forcedsleep/disable`,
      authToken: this.authToken
    };

    await this.sendRequest(request);
  }

  private formatUrl(id: string): string {
    return `${ this.apiV1Url }/devicesystemmode/icd/${ id }`;
  }
}

export { ApiV1DeviceSystemModeService };