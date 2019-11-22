import {inject, injectable} from 'inversify';
import { HttpService, HttpError } from '../http/HttpService'
import {InternalDevice, InternalDeviceCodec} from './models';
import { isLeft } from 'fp-ts/lib/Either';
import { FirestoreAuthService, FirestoreAssests, FirestoreTokenResponse } from '../core/session/FirestoreAuthService';
import { memoized, MemoizeMixin } from '../memoize/MemoizeMixin';
import Logger from 'bunyan';

const InternalDeviceServiceError = HttpError;

@injectable()
class InternalDeviceService extends MemoizeMixin(HttpService) implements FirestoreAuthService {
  @inject('InternalDeviceServiceBaseUrl') private internalDeviceServiceBaseUrl: string;
  @inject('Logger') private readonly logger: Logger;

  @memoized()
  public async getDevice(macAddress: string): Promise<InternalDevice | null> {
    try {
      const request = {
        method: 'get',
        url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}`,
        body: null,
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
      url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}/sync`,
      body: null,
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
        url: `${this.internalDeviceServiceBaseUrl}/firestore/devices/${macAddress}`,
        body: null,
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
}

export {InternalDeviceService};