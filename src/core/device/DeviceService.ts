import { injectable, inject } from 'inversify';
import DeviceDao from './DeviceDao';
import Logger from 'bunyan';
import { Device } from '../api/api';

@injectable()
class DeviceService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('DeviceDao') private deviceDao: DeviceDao
  ) {}

  public async getDeviceById(id: string) {
    const device: Device | null = await this.deviceDao.get(id);

    return device === null ? {} : device;
  }
}

export default DeviceService;