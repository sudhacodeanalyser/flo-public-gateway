import { inject, injectable } from 'inversify';
import DeviceTable from './DeviceTable';
import DeviceRecord from './DeviceRecord';
import { Device, DeviceType, DeviceModelType } from '../api/api';

@injectable()
class DeviceDao {
  constructor(
    @inject('DeviceTable') private deviceTable: DeviceTable
  ) {}

  public async get(id: string): Promise<Device | null> {
    const deviceRecord: DeviceRecord | null = await this.deviceTable.get({ id });

    if (deviceRecord === null) {
      return null;
    }

    return this.mapRecordToModel(deviceRecord); 
  }

  private mapRecordToModel(deviceRecord: DeviceRecord): Device {

    return {
      id: deviceRecord.id,
      macAddress: deviceRecord.device_id,
      nickname: deviceRecord.nickname,
      installation_point: deviceRecord.installation_point,
      location: {
        id: deviceRecord.location_id
      },
      created_at: deviceRecord.created_at,
      updated_at: deviceRecord.updated_at,
      // TODO enum int -> string mapping
      device_type: DeviceType.FLO_DEVICE,
      device_model: DeviceModelType.FLO_DEVICE_THREE_QUARTER_INCH
    };
  } 
}

export default DeviceDao;