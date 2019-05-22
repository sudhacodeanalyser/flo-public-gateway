import {inject, injectable} from 'inversify';
import {
  defaultInternalDeviceServicePayload,
  FwProperties,
  FwPropertiesCodec,
  InternalDevice,
  InternalDeviceCodec
} from './models';
import {InternalDeviceServiceHandler} from "./internalDeviceServiceHandler";
import InternalDeviceServiceError from "./internalDeviceServiceError";

@injectable()
class InternalDeviceService extends InternalDeviceServiceHandler {
  @inject('InternalDeviceServiceBaseUrl') private internalDeviceServiceBaseUrl: string;

  public async getDevice(macAddress: string): Promise<InternalDevice> {

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
        return defaultInternalDeviceServicePayload;
      } else {
        throw err;
      }
    }
  }

  public async setDeviceFwProperties(deviceId: string, data: Partial<FwProperties>): Promise<void> {

    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${deviceId}/fwproperties`,
      body: data,
    };

    await this.sendRequest(request);
  }
}

export {InternalDeviceService};