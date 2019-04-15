import { injectable, inject } from 'inversify';
import Logger from 'bunyan';
import { Device, DeviceDao } from '../api/api';

@injectable()
class DeviceService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('DeviceDao') private deviceDao: DeviceDao
  ) {}

  public async getDeviceById(id: string, expand?: string[]) {
    const device: Device | null = await this.deviceDao.get(id, expand);

    return device === null ? {} : device;
  }
}

export default DeviceService;