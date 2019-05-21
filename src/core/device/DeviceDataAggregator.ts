import {DeviceResponse} from '../api/response';
import {inject, injectable} from 'inversify';
import {InternalDeviceServiceFetcher} from '../../internal-device-service/InternalDeviceServiceFetcher';
import DeviceService from './DeviceService';
import _ from 'lodash';

@injectable()
export class DeviceDataAggregator {
  @inject('InternalDeviceServiceFetcher') private internalDeviceServiceFetcher: InternalDeviceServiceFetcher;
  @inject('DeviceService') private deviceService: DeviceService;

  public async getDevicebyId(id: string, expandProps: string[]): Promise<DeviceResponse | {}> {
    const additionalProperties = _.pick(
      await this.internalDeviceServiceFetcher.getDevice(id),
      ['fwProperties',
        'fwVersion',
        'lastHeardFromTime',
        'isConnected']
    );

    const device = await this.deviceService.getDeviceById(id, expandProps);

    if (device === null) {
      return {}
    }

    return {...device, ...additionalProperties}
  }
}