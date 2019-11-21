import Logger from 'bunyan';
import { isLeft } from 'fp-ts/lib/Either';
import { inject, injectable } from 'inversify';
import { DeviceActionRules, DeviceActionRulesCreate } from '../core/api';
import { FirestoreAssests, FirestoreAuthService, FirestoreTokenResponse } from '../core/session/FirestoreAuthService';
import { memoized, MemoizeMixin } from '../memoize/MemoizeMixin';
import InternalDeviceServiceError from "./internalDeviceServiceError";
import { InternalDeviceServiceHandler } from "./internalDeviceServiceHandler";
import { InternalDevice, InternalDeviceCodec } from './models';
import ResourceDoesNotExistError from '../core/api/error/ResourceDoesNotExistError';

@injectable()
class InternalDeviceService extends MemoizeMixin(InternalDeviceServiceHandler) implements FirestoreAuthService {
  @inject('InternalDeviceServiceBaseUrl') private internalDeviceServiceBaseUrl: string;
  @inject('Logger') private readonly logger: Logger;

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

  public async issueToken(assets: FirestoreAssests): Promise<FirestoreTokenResponse> {
    const request = {
      method: 'post',
      url: `${ this.internalDeviceServiceBaseUrl }/firestore/auth`,
      body: assets
    };

    return this.sendRequest(request);
  }

  public async cleanup(macAddress: string): Promise<void> {
    try {
      const request = {
        method: 'delete',
        url: `${this.internalDeviceServiceBaseUrl}/firestore/devices/${macAddress}`
      };
      // TODO: do the same ^^ for locations
      await this.sendRequest(request);
    } catch (err) {
      if (err instanceof InternalDeviceServiceError) {
        // Failure to complete the deletion of the firestore document should not cause the unpairing to completely fail.
        const errMsg = `failed to delete ${macAddress} document from devices collection in the Firestore`;
        this.logger.error( errMsg, err );
        return;
      } else {
        throw err;
      }
    }
  }

  public async createFirestoreStubDevice(macAddress: string): Promise<void> {
    try {
      const request = {
        method: 'post',
        url: `${ this.internalDeviceServiceBaseUrl }/firestore/devices/${macAddress}`,
        body: {
          value: {
            deviceId: macAddress
          }
        }
      };

      await this.sendRequest(request);
    } catch (err) {
      // Error should not break pairing
      this.logger.error({ err });
    }
  }

  public async getActionRules(deviceId: string): Promise<DeviceActionRules> {
    const request = {
      method: 'get',
      url: `${ this.internalDeviceServiceBaseUrl }/devices/${deviceId}/actionRules`
    };

    return this.sendRequest(request);
  }

  public async upsertActionRules(deviceId: string, actionRules: DeviceActionRulesCreate): Promise<DeviceActionRules> {
    const request = {
      method: 'post',
      url: `${ this.internalDeviceServiceBaseUrl }/devices/${deviceId}/actionRules`,
      body: actionRules
    };

    return this.sendRequest(request);
  }

  public async removeActionRule(deviceId: string, actionRuleId: string): Promise<void> {
    try {
      const request = {
        method: 'delete',
        url: `${ this.internalDeviceServiceBaseUrl }/devices/${deviceId}/actionRules/${actionRuleId}`
      };

      await this.sendRequest(request);
    } catch (err) {
      if (err instanceof InternalDeviceServiceError && err.statusCode === 404) {
        throw new ResourceDoesNotExistError('Action Rule does not exist.');
      }
      throw err;
    }
  }
}

export { InternalDeviceService };
