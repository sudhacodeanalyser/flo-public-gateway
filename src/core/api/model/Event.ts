export enum DeviceMake {
  LTE = 'lte',
  FLO_DEVICE_V2 = 'flo_device_v2',
  UNKNOWN = 'unknown',
}

export interface Event {
  createdAt:    string;
  refId:        string;
  eventType?:   string;
  deviceMake:   DeviceMake;
  deviceModel?: string;
  data:         string;
}

export type RawEvent = { [property: string]: string | undefined };

export function toDeviceMake(value?: string): DeviceMake {
  switch(value) {
    case 'lte':
      return DeviceMake.LTE;
    case 'flo_device_v2':
      return DeviceMake.FLO_DEVICE_V2;
    default:
      return DeviceMake.UNKNOWN;
  }
}

export function getEventRefIdPropertyName(make: DeviceMake): string | null {
  switch(make) {
    case DeviceMake.LTE:
      return 'imei';
    case DeviceMake.FLO_DEVICE_V2:
      return 'macAddress';
    default:
      return null;
  }
}