// These should likely go into a lookup table
export enum DeviceType {
  FLO_DEVICE = 1,
  PUCK
}

export enum DeviceModelType {
  FLO_DEVICE_THREE_QUARTER_INCH = 1,
  FLO_DEVICE_ONE_AND_QUARTER_INCH
}

export default interface DeviceRecord {
  id: string,
  location_id: string,
  device_id: string,
  device_type?: DeviceType,
  device_model?: DeviceModelType,
  installation_point?: string,
  nickname?: string,
  created_at?: string,
  updated_at?: string
}