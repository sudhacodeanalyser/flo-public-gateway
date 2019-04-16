import { injectable, inject } from 'inversify';
import Logger from 'bunyan';
import { Device, DeviceUpdate } from '../api/api';
import { DeviceResolver } from '../resolver';

@injectable()
class DeviceService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('DeviceResolver') private deviceResolver: DeviceResolver
  ) {}

  public async getDeviceById(id: string, expand?: string[]) {
    const device: Device | null = await this.deviceResolver.get(id, expand);

    return device === null ? {} : device;
  }

  public partiallyUpdateDevice(id: string, deviceUpdate: DeviceUpdate) {
    return this.deviceResolver.updatePartial(id, deviceUpdate);
  }
}

export default DeviceService;