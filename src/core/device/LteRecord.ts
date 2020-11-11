import { morphism, StrictSchema } from 'morphism';
import { Lte } from '../api';

export interface LteRecordData {
  imei: string;
  iccid: string;
  rnd_key: string;
  qr_code: string;
  offset_index?: number;
  ssid_offset?: number;
  pwd_offset?: number;
}

const LteRecordToModelSchema: StrictSchema<Lte, LteRecordData> = {
  imei: 'imei',
  iccid: 'iccid',
  randomKey: 'rnd_key',
  qrCode: 'qr_code',
  offsetIndex: 'offset_index',
  ssidOffset: 'ssid_offset',
  passwordOffset: 'pwd_offset'
}

export class LteRecord {
  constructor(
    public data: LteRecordData
  ) {}

  public toModel(): Lte {
    return morphism(LteRecordToModelSchema, this.data);
  }
}

export interface DeviceLteRecordData {
  device_id: string;
  imei: string;
}