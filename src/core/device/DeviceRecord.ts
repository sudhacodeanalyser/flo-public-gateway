import { $enum } from 'ts-enum-util';
import _ from 'lodash';
// These should likely go into a lookup table
import { Device, DeviceType, DeviceModelType, NoYesUnsure, IrrigationType } from '../api';

export enum DeviceTypeData {
  FLO_DEVICE = 1,
  PUCK
}

export enum DeviceModelTypeData {
  FLO_DEVICE_THREE_QUARTER_INCH = 1,
  FLO_DEVICE_ONE_AND_QUARTER_INCH
}

export enum NoYesUnsureData {
  NO = 0,
  YES = 1,
  UNSURE = 2
}

export enum IrrigationTypeData {
  NONE = 0,
  SPRINKLERS = 1,
  DRIP = 2
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
  is_paired?: boolean;
  prv_installed_after?: NoYesUnsureData;
  irrigation_type?: IrrigationTypeData;
}

const DeviceTypeDataEnum = $enum(DeviceTypeData);
const DeviceModelTypeDataEnum = $enum(DeviceModelTypeData);

const DeviceTypeEnum = $enum(DeviceType);
const DeviceModelTypeEnum = $enum(DeviceModelType);

const NoYesUnsureEnum = $enum(NoYesUnsure);
const NoYesUnsureDataEnum = $enum(NoYesUnsureData);

const IrrigationTypeEnum = $enum(IrrigationType);
const IrrigationTypeDataEnum = $enum(IrrigationTypeData);

export class DeviceRecord {

  public static fromPartialModel(model: Partial<Device>): Partial<DeviceRecordData> {
    const deviceTypeKey = DeviceTypeEnum.getKeyOrDefault(model.deviceType);
    const deviceType = deviceTypeKey && DeviceTypeData[deviceTypeKey];

    const deviceModelKey = DeviceModelTypeEnum.getKeyOrDefault(model.deviceModel);
    const deviceModel = deviceModelKey && DeviceModelTypeData[deviceModelKey];
    const prvInstalledAfterKey = NoYesUnsureEnum.getKeyOrDefault(model.prvInstalledAfter, 'UNSURE');
    const irrigationTypeKey = IrrigationTypeEnum.getKeyOrDefault(model.irrigationType);

    return {
      id: model.id,
      device_id: model.macAddress,
      nickname: model.nickname,
      installation_point: model.installationPoint,
      location_id: model.location && model.location.id,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
      device_type: deviceType,
      device_model: deviceModel,
      is_paired: model.isPaired,
      prv_installed_after: NoYesUnsureData[prvInstalledAfterKey],
      irrigation_type: irrigationTypeKey && IrrigationTypeData[irrigationTypeKey]
    };
  }

  public static fromModel(model: Device): DeviceRecordData {
    return DeviceRecord.fromPartialModel(model) as DeviceRecordData;
  }

  constructor(
    public data: DeviceRecordData
  ) {}

  public toModel(): Device {
    // TODO: Check defaults.
    const deviceTypeKey = DeviceTypeDataEnum.getKeyOrDefault(this.data.device_type, 'FLO_DEVICE');
    const deviceModelKey = DeviceModelTypeDataEnum.getKeyOrDefault(this.data.device_model, 'FLO_DEVICE_THREE_QUARTER_INCH');
    const prvInstalledAfterKey = NoYesUnsureDataEnum.getKeyOrDefault(this.data.prv_installed_after, 'UNSURE');
    const irrigationTypeKey = IrrigationTypeDataEnum.getKeyOrDefault(this.data.irrigation_type, 'NONE');

    return {
      id: this.data.id,
      macAddress: this.data.device_id,
      nickname: this.data.nickname,
      installationPoint: this.data.installation_point,
      location: {
        id: this.data.location_id
      },
      createdAt: this.data.created_at,
      updatedAt: this.data.updated_at,
      deviceType: DeviceType[deviceTypeKey],
      deviceModel: DeviceModelType[deviceModelKey],
      isPaired: _.get(this.data, 'is_paired', false),
      additionalProps: null,
      prvInstalledAfter: NoYesUnsure[prvInstalledAfterKey],
      irrigationType: IrrigationType[irrigationTypeKey]
    };
  }
}