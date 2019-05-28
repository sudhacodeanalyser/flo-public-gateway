import { $enum } from 'ts-enum-util';
import _ from 'lodash';
// These should likely go into a lookup table
import { Device, DeviceType, DeviceModelType, IrrigationType } from '../api';
import { NoYesUnsure } from '../api/NoYesUnsure';
import { translateNumericToStringEnum, translateStringToNumericEnum } from '../api/enumUtils';

export enum DeviceTypeData {
  FLO_DEVICE = 1,
  PUCK
}

export enum DeviceModelTypeData {
  FLO_DEVICE_THREE_QUARTER_INCH = 1,
  FLO_DEVICE_ONE_AND_QUARTER_INCH
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
  prv_installed_after?: NoYesUnsure.Numeric;
  irrigation_type?: IrrigationTypeData;
}

export class DeviceRecord {

  public static fromPartialModel(model: Partial<Device>): Partial<DeviceRecordData> {
    const deviceType = translateStringToNumericEnum(
      DeviceTypeData,
      DeviceType,
      model.deviceType,
      'FLO_DEVICE'
    ) || DeviceTypeData.FLO_DEVICE;
    const deviceModel = translateStringToNumericEnum(
      DeviceModelTypeData,
      DeviceModelType,
      model.deviceModel,
      'FLO_DEVICE_THREE_QUARTER_INCH'
    ) || DeviceModelTypeData.FLO_DEVICE_THREE_QUARTER_INCH;
    const prvInstalledAfter = translateStringToNumericEnum(
      NoYesUnsure.Numeric, 
      NoYesUnsure.String, 
      model.prvInstalledAfter, 
      'UNSURE'
    );
    const irrigationType = translateStringToNumericEnum(
      IrrigationTypeData, 
      IrrigationType, 
      model.irrigationType
    );

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
      prv_installed_after: prvInstalledAfter,
      irrigation_type: irrigationType
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
    const deviceType = translateNumericToStringEnum(
      DeviceType,
      DeviceTypeData,
      this.data.device_type,
      'FLO_DEVICE'
    ) || DeviceType.FLO_DEVICE;
    const deviceModel = translateNumericToStringEnum(
      DeviceModelType,
      DeviceModelTypeData,
      this.data.device_model,
      'FLO_DEVICE_THREE_QUARTER_INCH'
    ) || DeviceModelType.FLO_DEVICE_THREE_QUARTER_INCH;
    const irrigationType = translateNumericToStringEnum(
      IrrigationType, 
      IrrigationTypeData, 
      this.data.irrigation_type
    );
    const prvInstalledAfter = translateNumericToStringEnum(
      NoYesUnsure.String, 
      NoYesUnsure.Numeric, 
      this.data.prv_installed_after, 
      'UNSURE'
    );

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
      deviceType,
      deviceModel,
      isPaired: _.get(this.data, 'is_paired', false),
      additionalProps: null,
      prvInstalledAfter,
      irrigationType
    };
  }
}