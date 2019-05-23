import { inject, injectable } from 'inversify';
import InternalDeviceServiceError from "./internalDeviceServiceError";
import { InternalDeviceServiceHandler } from "./internalDeviceServiceHandler";
import { InternalDevice, InternalDeviceCodec } from './models';

@injectable()
class InternalDeviceService extends InternalDeviceServiceHandler {
  @inject('InternalDeviceServiceBaseUrl') private internalDeviceServiceBaseUrl: string;

  public async getDevice(macAddress: string): Promise<InternalDevice | null> {

    try {
      const request = {
        method: 'get',
        url: `${this.internalDeviceServiceBaseUrl}/devices/${macAddress}`,
        body: null,
      };

      const response = await this.sendRequest(request);

      if (InternalDeviceCodec.decode(response).isLeft()) {
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

  public async setDeviceFwProperties(deviceId: string, data: object): Promise<void> {

    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${deviceId}/fwproperties`,
      body: data,
    };

    await this.sendRequest(request);
  }
}

export { InternalDeviceService };

