import {inject, injectable} from 'inversify';
import InternalDeviceServiceError from "./internalDeviceServiceError";
import {InternalDeviceServiceHandler} from "./internalDeviceServiceHandler";
import {InternalDevice, InternalDeviceCodec} from './models';
import { isLeft } from 'fp-ts/lib/Either';
import { FirestoreAuthService, FirestoreAssests, FirestoreTokenResponse } from '../core/session/FirestoreAuthService';
import { memoized, MemoizeMixin } from '../memoize/MemoizeMixin';
import Logger from 'bunyan';

@injectable()
class InternalDeviceService extends MemoizeMixin(InternalDeviceServiceHandler) implements FirestoreAuthService {
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

  public async setDeviceFwProperties(deviceId: string, data: { [prop: string]: any }): Promise<void> {
    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${deviceId}/fwproperties`,
      body: data,
    };

    await this.sendRequest(request);
  }

  public async issueToken(assets: FirestoreAssests): Promise<FirestoreTokenResponse> {
    const request = {
      method: 'POST',
      url: `${ this.internalDeviceServiceBaseUrl }/firestore/auth`,
      body: assets
    };

    return this.sendRequest(request);
  }

  public async cleanup(deviceId: string): Promise<void> {
    try {
      const request = {
        method: 'DELETE',
        url: `${this.internalDeviceServiceBaseUrl}/firestore/devices/${deviceId}`,
        body: null,
      };
      // TODO: do the same ^^ for locations
      await this.sendRequest(request);
    } catch (err) {
      if (err instanceof InternalDeviceServiceError) {
        // Failure to complete the deletion of the firestore document should not cause the unpairing to completely fail.
        const errMsg = `failed to delete ${deviceId} document from devices collection in the Firestore`;
        this.logger.error( errMsg, err );
        return;
      } else {
        throw err;
      }
    }
  }

  public async createFirestoreStubDevice(deviceId: string): Promise<void> {
    try {
      const request = {
        method: 'POST',
        url: `${ this.internalDeviceServiceBaseUrl }/firestore/devices/${ deviceId }`,
        body: {
          value: {
            deviceId
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