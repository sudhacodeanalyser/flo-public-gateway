import { injectable, inject } from 'inversify';
import { Device, DeviceUpdate } from '../api';
import { DeviceResolver } from '../resolver';

@injectable()
class DeviceService {
  constructor(
    @inject('DeviceResolver') private deviceResolver: DeviceResolver
  ) {}

  public async getDeviceById(id: string, expand?: string[]): Promise<Device | {}> {
    const device: Device | null = await this.deviceResolver.get(id, expand);

    return device === null ? {} : device;
  }

  public async updatePartialDevice(id: string, deviceUpdate: DeviceUpdate): Promise<Device> {
    return this.deviceResolver.updatePartial(id, deviceUpdate);
  }

  public async removeDevice(id: string): Promise<void> {
    return this.deviceResolver.remove(id);
  }
}

export default DeviceService;