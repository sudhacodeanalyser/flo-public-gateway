import { morphism, StrictSchema } from 'morphism';
import { Lte } from '../api';

export interface LteRecordData {
  imei: string;
  icc_id: string;
  rnd_key: string;
  qr_code: string;
  ssid_offset: number;
  pwd_offset: number;
}

const RecordToModelSchema: StrictSchema<Lte, LteRecordData> = {
  imei: 'imei',
  iccId: 'icc_id',
  randomKey: 'rnd_key',
  qrCode: 'qr_code',
  ssidOffset: 'ssid_offset',
  passwordOffset: 'pwd_offset'
}

export class LteRecord {
  constructor(
    public data: LteRecordData
  ) {}

  public toModel(): Lte {
    return morphism(RecordToModelSchema, this.data);
  }
}

export interface DeviceLteRecordData {
  device_id: string;
  imei: string;
}