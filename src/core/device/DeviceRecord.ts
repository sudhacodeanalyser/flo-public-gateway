import { $enum } from 'ts-enum-util';
import _ from 'lodash';
// These should likely go into a lookup table
import { Device, DeviceType, DeviceModelType, IrrigationType, DeviceSystemMode } from '../api';
import { NoYesUnsure } from '../api/NoYesUnsure';
import { translateNumericToStringEnum, translateStringToNumericEnum } from '../api/enumUtils';
import { morphism, StrictSchema } from 'morphism';
import * as t from 'io-ts';

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
  should_inherit_system_mode?: boolean;
  target_system_mode?: DeviceSystemMode;
  revert_scheduled_at?: string;
  revert_mode: DeviceSystemMode;
  revert_minutes?: number;
}

const RecordToModelSchema: StrictSchema<Device, DeviceRecordData>  = {
  id: 'id',
  macAddress: 'device_id',
  nickname: 'nickname',
  installationPoint: 'installation_point',
  location: {
    id: 'location_id'
  },
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isPaired: (input: DeviceRecordData) => _.get(input, 'is_paired', false),
  additionalProps: () => null,
  deviceModel: (input: DeviceRecordData) => 
    translateNumericToStringEnum(
      DeviceModelType,
      DeviceModelTypeData,
      input.device_model,
      'FLO_DEVICE_THREE_QUARTER_INCH'
    ) || DeviceModelType.FLO_DEVICE_THREE_QUARTER_INCH,
  deviceType: (input: DeviceRecordData) => 
   translateNumericToStringEnum(
        DeviceType,
        DeviceTypeData,
        input.device_type,
        'FLO_DEVICE'
      ) || DeviceType.FLO_DEVICE,
  irrigationType: (input: DeviceRecordData) =>
    translateNumericToStringEnum(
      IrrigationType, 
      IrrigationTypeData, 
      input.irrigation_type
    ),
  prvInstalledAfter: (input: DeviceRecordData) =>
    translateNumericToStringEnum(
      NoYesUnsure.String, 
      NoYesUnsure.Numeric, 
      input.prv_installed_after, 
      'UNSURE'
    ),
  systemMode: (input: DeviceRecordData) => ({
    target: input.target_system_mode,
    isLocked: false,
    shouldInherit: _.get(input, 'should_inherit_system_mode', true),
    revertScheduledAt: input.revert_scheduled_at,
    revertMode: input.revert_mode,
    revertMinutes: input.revert_minutes,
    lastKnown: undefined
  })
};

const ModelToRecordSchema: StrictSchema<DeviceRecordData, Device> = {
  id: 'id',
  location_id: 'location.id',
  device_id: 'macAddress',
  nickname: 'nickname',
  installation_point: 'installationPoint',
  is_paired: 'isPaired',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  should_inherit_system_mode: 'systemMode.shouldInherit',
  revert_scheduled_at: 'systemMode.revertScheduledAt',
  revert_mode: 'systemMode.revertMode',
  revert_minutes: 'systemMode.revertMinutes',
  target_system_mode: 'systemMode.target',
  device_type: (input: Device) => 
    translateStringToNumericEnum(
      DeviceTypeData,
      DeviceType,
      input.deviceType,
      'FLO_DEVICE'
    ) || DeviceTypeData.FLO_DEVICE,
  device_model: (input: Device) =>
    translateStringToNumericEnum(
      DeviceModelTypeData,
      DeviceModelType,
      input.deviceModel,
      'FLO_DEVICE_THREE_QUARTER_INCH'
    ) || DeviceModelTypeData.FLO_DEVICE_THREE_QUARTER_INCH,
  prv_installed_after: (input: Device) => 
    translateStringToNumericEnum(
      NoYesUnsure.Numeric, 
      NoYesUnsure.String, 
      input.prvInstalledAfter, 
      'UNSURE'
    ),
  irrigation_type: (input: Device) =>
    translateStringToNumericEnum(
      IrrigationTypeData, 
      IrrigationType, 
      input.irrigationType
    )
};

const PartialModelToRecordSchema: StrictSchema<Partial<DeviceRecordData>, Partial<Device>> = {
  id: 'id',
  location_id: 'location.id',
  device_id: 'macAddress',
  nickname: 'nickname',
  installation_point: 'installationPoint',
  is_paired: 'isPaired',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  should_inherit_system_mode: 'systemMode.shouldInherit',
  revert_scheduled_at: 'systemMode.revertScheduledAt',
  revert_mode: 'systemMode.revertMode',
  revert_minutes: 'systemMode.revertMinutes',
  target_system_mode: 'systemMode.target',
  device_type: (input: Partial<Device>) => 
    input.deviceType && translateStringToNumericEnum(
      DeviceTypeData,
      DeviceType,
      input.deviceType
    ),
  device_model: (input: Partial<Device>) =>
    input.deviceModel && translateStringToNumericEnum(
      DeviceModelTypeData,
      DeviceModelType,
      input.deviceModel
    ),
  prv_installed_after: (input: Partial<Device>) => 
    input.prvInstalledAfter && translateStringToNumericEnum(
      NoYesUnsure.Numeric, 
      NoYesUnsure.String, 
      input.prvInstalledAfter
    ),
  irrigation_type: (input: Partial<Device>) =>
    input.irrigationType && translateStringToNumericEnum(
      IrrigationTypeData, 
      IrrigationType, 
      input.irrigationType
    )
};

export class DeviceRecord {

  public static fromPartialModel(model: Partial<Device>): Partial<DeviceRecordData> {
    return morphism(PartialModelToRecordSchema, model);
  }

  public static fromModel(model: Device): DeviceRecordData {
    return morphism(ModelToRecordSchema, model);
  }

  constructor(
    public data: DeviceRecordData
  ) {}

  public toModel(): Device {
    return morphism(RecordToModelSchema, this.data);
  }
}