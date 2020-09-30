import { inject, injectable, targetName } from 'inversify';
import squel from 'squel';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { DeviceLteRecordData } from './LteRecord';

@injectable()
class DeviceLteTable extends PostgresTable<DeviceLteRecordData> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'device_lte');
  }

  public async getDeviceIdsByLteQrCode(qrCode: string): Promise<string[]> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .from('"device_lte"')
      .field('"device_id"', '"deviceId"')
      .join('"lte"', '"device_lte"."imei" = "lte"."imei"')
      .where('"lte"."qr_code" = ?', qrCode)
      .toParam();
    
    const results = await this.pgDbClient.execute(text, values);
    return results.rows.map(r => r.deviceId);
  }

  public async linkDevice(imei: string, deviceId: string): Promise<void> {
    const { text, values } = squel.useFlavour('postgres')
      .insert()
      .into('"device_lte"')
      .setFields({
        device_id: deviceId,
        imei
      })
      .toParam();
    
    await this.pgDbClient.execute(text, values);
  }

  public async unlinkDevice(deviceId: string): Promise<void> {
    const { text, values } = squel.useFlavour('postgres')
      .delete()
      .from('"device_lte"')
      .where('"device_id" = ?', deviceId)
      .toParam();
    
    await this.pgDbClient.execute(text, values);
  }
}

export default DeviceLteTable;