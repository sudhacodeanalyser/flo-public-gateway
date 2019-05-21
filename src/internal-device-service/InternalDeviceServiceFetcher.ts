import {inject, injectable} from 'inversify';
import {FwProperties, InternalDeviceService, FwPropertiesCodec, InternalDeviceServiceCodec} from './model';
import {InternalDeviceServiceHandler} from "./internalDeviceServiceHandler";

@injectable()
class InternalDeviceServiceFetcher extends InternalDeviceServiceHandler {
  @inject('InternalDeviceServiceBaseURL') private internalDeviceServiceBaseURL: string;

  public async getDevice(deviceId: string): Promise<InternalDeviceService> {

    const request = {
      method: 'get',
      url: `${this.internalDeviceServiceBaseURL}/device/${deviceId}`,
      body: null,
    };

    const response = await this.sendRequest(request);

    if (!InternalDeviceServiceCodec.is(response)) {
      throw new Error('Invalid response.');
    }

    return response as InternalDeviceService;

  }

  public async modifyDeviceFwProperties(deviceId: string, data: FwProperties): Promise<void> {

    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseURL}/device/${deviceId}/fwproperties`,
      body: data,
    };

    const response = await this.sendRequest(request);

    return;

  }

}