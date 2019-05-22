import {inject, injectable} from 'inversify';
import {FwPropertiesCodec, InternalDevice, InternalDeviceCodec} from './models';
import {InternalDeviceServiceHandler} from "./internalDeviceServiceHandler";

@injectable()
class InternalDeviceService extends InternalDeviceServiceHandler {
  @inject('InternalDeviceServiceBaseUrl') private internalDeviceServiceBaseUrl: string;

  public async getDevice(macAddress: string): Promise<InternalDevice> {

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
  }

  public async setDeviceFwProperties(deviceId: string, data: any): Promise<void> {

    if (!FwPropertiesCodec.is(data)) {
      throw new Error('Invalid input.');
    }

    const request = {
      method: 'post',
      url: `${this.internalDeviceServiceBaseUrl}/devices/${deviceId}/fwproperties`,
      body: data,
    };

    await this.sendRequest(request);
  }
}

export {InternalDeviceService};