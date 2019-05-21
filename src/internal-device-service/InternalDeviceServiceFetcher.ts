import {inject, injectable} from 'inversify';
import {FwPropertiesCodec, InternalDeviceService, InternalDeviceServiceCodec} from './models';
import {InternalDeviceServiceHandler} from "./internalDeviceServiceHandler";

@injectable()
class InternalDeviceServiceFetcher extends InternalDeviceServiceHandler {
  @inject('InternalDeviceServiceBaseURL') private internalDeviceServiceBaseURL: string;

  public async getDevice(deviceId: string): Promise<InternalDeviceService> {

    const request = {
      method: 'get',
      url: `${this.internalDeviceServiceBaseURL}/devices/${deviceId}`,
      body: null,
    };

    const response = await this.sendRequest(request);

    if (!InternalDeviceServiceCodec.is(response)) {
      throw new Error('Invalid response.');
    }

    return response as InternalDeviceService;
  }

  public async setDeviceFwProperties(deviceId: string, data: any): Promise<void> {

    if (!FwPropertiesCodec.is(data)) {
      throw new Error('Invalid input.');
    }

    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseURL}/devices/${deviceId}/fwproperties`,
      body: data,
    };

    await this.sendRequest(request);
  }
}

export {InternalDeviceServiceFetcher};