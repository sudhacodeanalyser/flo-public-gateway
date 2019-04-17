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

  public async getDeviceById(id: string, expand?: string[]): Promise<Device | {}> {
    const device: Device | null = await this.deviceResolver.get(id, expand);

    return device === null ? {} : device;
  }

  public async partiallyUpdateDevice(id: string, deviceUpdate: DeviceUpdate): Promise<Device> {
    return this.deviceResolver.updatePartial(id, deviceUpdate);
  }

  public async removeDevice(id: string): Promise<void> {
    return this.deviceResolver.remove(id);
  }
}

export default DeviceService;