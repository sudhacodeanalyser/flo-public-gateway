// These should likely go into a lookup table
import { Device, DeviceType, DeviceModelType } from '../api/api';

export enum DeviceTypeData {
  FLO_DEVICE = 1,
  PUCK
}

export enum DeviceModelTypeData {
  FLO_DEVICE_THREE_QUARTER_INCH = 1,
  FLO_DEVICE_ONE_AND_QUARTER_INCH
}

export interface DeviceRecordData {
  id: string;
  location_id: string;
  device_id: string;
  device_type?: DeviceTypeData;
  device_model?: DeviceModelTypeData;
  installation_point?: string;
  nickname?: string;
  created_at?: string;
  updated_at?: string;
}

export class DeviceRecord {

  public static fromPartialModel(model: Partial<Device>): Partial<DeviceRecordData> {
    return {
      id: model.id,
      device_id: model.macAddress,
      nickname: model.nickname,
      installation_point: model.installation_point,
      location_id: model.location && model.location.id,
      created_at: model.created_at,
      updated_at: model.updated_at,
      // TODO enum string ->
      device_type: model.device_type && DeviceTypeData.FLO_DEVICE,
      device_model: model.device_model && DeviceModelTypeData.FLO_DEVICE_THREE_QUARTER_INCH
    };
  }

  constructor(
    public data: DeviceRecordData
  ) {}

  public toModel(): Device {
    return {
      id: this.data.id,
      macAddress: this.data.device_id,
      nickname: this.data.nickname,
      installation_point: this.data.installation_point,
      location: {
        id: this.data.location_id
      },
      created_at: this.data.created_at,
      updated_at: this.data.updated_at,
      // TODO enum int -> string mapping
      device_type: DeviceType.FLO_DEVICE,
      device_model: DeviceModelType.FLO_DEVICE_THREE_QUARTER_INCH
    };
  }
}