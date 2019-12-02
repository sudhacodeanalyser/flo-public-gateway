import Logger from 'bunyan';
import { isLeft } from 'fp-ts/lib/Either';
import { inject, injectable } from 'inversify';
import { HttpService, HttpError } from '../http/HttpService'
import { FirestoreAssests, FirestoreAuthService, FirestoreTokenResponse } from '../core/session/FirestoreAuthService';
import { DeviceActionRules, DeviceActionRulesCreate, DeviceCreate, HardwareThresholds } from '../core/api';
import { memoized, MemoizeMixin } from '../memoize/MemoizeMixin';
import { InternalDevice, InternalDeviceCodec } from './models';
import ResourceDoesNotExistError from '../core/api/error/ResourceDoesNotExistError';

const InternalDeviceServiceError = HttpError;

@injectable()
class InternalDeviceService extends MemoizeMixin(HttpService) implements FirestoreAuthService {
  @inject('InternalDeviceServiceBaseUrl') private internalDeviceServiceBaseUrl: string;
  @inject('Logger') private readonly logger: Logger;

  public async createDevice(device: DeviceCreate): Promise<void> {
    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${device.macAddress}`,
      body: {
        nickname: device.nickname,
        locationId: device.location.id,
        make: device.deviceType,
        model: device.deviceModel
      }
    };

    await this.sendRequest(request);
  }

  @memoized()
  public async getDevice(macAddress: string): Promise<InternalDevice | null> {
    try {
      const request = {
        method: 'get',
        url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}`
      };

      const response = await this.sendRequest(request);

      if (isLeft(InternalDeviceCodec.decode(response))) {
        throw new Error('Invalid response.');
      }

      return response as InternalDevice;
    } catch (err) {
      if (err instanceof InternalDeviceServiceError && err.statusCode === 404) {
        return null;
      } else {
        throw err;
      }
    }
  }

  public async setDeviceFwProperties(macAddress: string, data: { [prop: string]: any }): Promise<void> {
    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}/fwproperties`,
      body: data,
    };

    await this.sendRequest(request);
  }

  public async syncDevice(macAddress: string): Promise<void> {
    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}/sync`
    };

    await this.sendRequest(request);
  }

  public async createDeviceStub(macAddress: string): Promise<void> {
    try {
      const request = {
        method: 'post',
        url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}/stub`
      };

      await this.sendRequest(request);
    } catch (err) {
      // Error should not break pairing
      this.logger.error({ err }, `Error creating device stub for MAC Address ${macAddress}`);
    }
  }

  public async issueToken(assets: FirestoreAssests): Promise<FirestoreTokenResponse> {
    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/firestore/auth`,
      body: assets
    };

    return this.sendRequest(request);
  }

  public async removeDevice(macAddress: string): Promise<void> {
    try {
      const request = {
        method: 'delete',
        url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}`
      };
      await this.sendRequest(request);
    } catch (err) {
      if (err instanceof InternalDeviceServiceError) {
        const errMsg = `Failed to delete Device with MAC Address ${macAddress} from Device Service`;
        this.logger.error({ err }, errMsg);
      } else {
        throw err;
      }
    }
  }

  public async getActionRules(deviceId: string): Promise<DeviceActionRules> {
    const request = {
      method: 'get',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${deviceId}/actionRules`
    };

    return this.sendRequest(request);
  }

  public async upsertActionRules(deviceId: string, actionRules: DeviceActionRulesCreate): Promise<DeviceActionRules> {
    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${deviceId}/actionRules`,
      body: actionRules
    };

    return this.sendRequest(request);
  }

  public async removeActionRule(deviceId: string, actionRuleId: string): Promise<void> {
    try {
      const request = {
        method: 'delete',
        url: `${ this.internalDeviceServiceBaseUrl}/devices/${deviceId}/actionRules/${actionRuleId}`
      };

      await this.sendRequest(request);
    } catch (err) {
      if (err instanceof InternalDeviceServiceError && err.statusCode === 404) {
        throw new ResourceDoesNotExistError('Action Rule does not exist.');
      }
      throw err;
    }
  }

  public async setHardwareThresholds(macAddress: string, hardwareThresholds: HardwareThresholds): Promise<void> {
    const request = {
      method: 'put',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}/hardwareThresholds`,
      body: hardwareThresholds
    };

    return this.sendRequest(request);
  }
}

export { InternalDeviceService };
