import _ from 'lodash';
import { morphism, StrictSchema } from 'morphism';
// These should likely go into a lookup table
import { Device, DeviceModelType, DeviceType, SystemMode as DeviceSystemMode, ValveState } from '../api';
import { NoYesUnsure } from '../api/NoYesUnsure';

export interface DeviceRecordData {
  id: string;
  location_id: string;
  device_id: string;
  device_type?: string;
  device_model?: string;
  installation_point?: string;
  nickname?: string;
  created_at?: string;
  updated_at?: string;
  is_paired?: boolean;
  prv_installation?: string;
  irrigation_type?: string;
  should_inherit_system_mode?: boolean;
  target_system_mode?: DeviceSystemMode;
  revert_scheduled_at?: string;
  revert_mode: DeviceSystemMode;
  revert_minutes?: number;
  target_valve_state: ValveState;
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
  deviceModel: (input: DeviceRecordData) => _.get(input, 'device_model', DeviceType.FLO_DEVICE_V2),
  deviceType: (input: DeviceRecordData) => _.get(input, 'device_type', DeviceModelType.FLO_0_75),
  irrigationType: 'irrigation_type',
  prvInstallation: 'prv_installation',
  systemMode: (input: DeviceRecordData) => ({
    target: input.target_system_mode,
    isLocked: false,
    shouldInherit: _.get(input, 'should_inherit_system_mode', true),
    revertScheduledAt: input.revert_scheduled_at,
    revertMode: input.revert_mode,
    revertMinutes: input.revert_minutes,
    lastKnown: undefined
  }),
  valve: (input: DeviceRecordData) => ({
    target: input.target_valve_state
  }),
  irrigationSchedule: () => undefined,
  installStatus: () => ({
    isInstalled: false
  }),
  notifications: () => undefined,
  hardwareThresholds: () => undefined
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
  target_valve_state: 'valve.target',
  device_type: 'deviceType',
  device_model: 'deviceModel',
  prv_installation: 'prvInstallation',
  irrigation_type: 'irrigationType'
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
  target_valve_state: 'valve.target',
  device_type: 'deviceType',
  device_model: 'deviceModel',
  prv_installation: 'prvInstallation',
  irrigation_type: 'irrigationType'
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