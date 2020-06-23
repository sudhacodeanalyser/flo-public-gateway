export interface DeviceUpdate {
  macAddress: string;
  prevDeviceInfo: {
    request_id: string;
    device_id: string;
    timestamp: number;
    reason: string;
    properties: Record<string, any>
  };
  changeRequest: {
    meta?: Record<string, any>;
    fwProperties: Record<string, any>;
  }
}