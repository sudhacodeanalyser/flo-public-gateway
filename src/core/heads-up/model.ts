import { InternalDevice } from '../../internal-device-service/models';

export interface DeviceUpdate {
  macAddress: string;
  prevDeviceInfo: InternalDevice;
  changeRequest: {
    meta?: Record<string, any>;
    fwProperties: Record<string, any>;
  }
}