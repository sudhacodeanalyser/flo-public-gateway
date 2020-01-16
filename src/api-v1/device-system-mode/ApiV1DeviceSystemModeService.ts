import { injectable } from 'inversify';
import { HttpService } from '../../http/HttpService';
import { DeviceSystemModeService } from '../../core/device/DeviceSystemModeService';
import { SystemMode, DeviceSystemModeNumeric } from '../../core/api';
import { translateStringToNumericEnum } from '../../core/api/enumUtils';

@injectable()
class ApiV1DeviceSystemModeService extends HttpService implements DeviceSystemModeService {
  public apiV1Url: string;
  public authToken: string;
  public customHeaders: any;

  public async setSystemMode(id: string, systemMode: SystemMode): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/setsystemmode`,
      authToken: this.authToken,
      customHeaders: this.customHeaders,
      body: {
        system_mode: translateStringToNumericEnum(DeviceSystemModeNumeric, SystemMode, systemMode)
      }
    };

    await this.sendRequest(request);
  }

  public async sleep(id: string, sleepMinutes: number, wakeUpSystemMode: SystemMode): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/sleep`,
      authToken: this.authToken,
      customHeaders: this.customHeaders,
      body: {
        sleep_minutes: sleepMinutes,
        wake_up_system_mode: translateStringToNumericEnum(DeviceSystemModeNumeric, SystemMode, wakeUpSystemMode)
      }
    };

    await this.sendRequest(request);
  }

  public async enableForcedSleep(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/forcedsleep/enable`,
      authToken: this.authToken,
      customHeaders: this.customHeaders
    };

    await this.sendRequest(request);
  }

  public async disableForcedSleep(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.formatUrl(id) }/forcedsleep/disable`,
      authToken: this.authToken,
      customHeaders: this.customHeaders
    };

    await this.sendRequest(request);
  }

  private formatUrl(id: string): string {
    return `${ this.apiV1Url }/devicesystemmode/icd/${ id }`;
  }
}

export { ApiV1DeviceSystemModeService };

