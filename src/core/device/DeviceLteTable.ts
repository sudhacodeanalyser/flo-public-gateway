import { inject, injectable, targetName } from 'inversify';
import squel from 'safe-squel';
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
      .join('"lte"', undefined, '"device_lte"."imei" = "lte"."imei"')
      .where('"lte"."qr_code" = ?', qrCode)
      .toParam();
    
    const results = await this.pgDbClient.execute(text, values);
    return results.rows.map(r => r.deviceId);
  }

  public async linkDevice(deviceId: string, imei: string): Promise<boolean> {
    const { text, values } = squel.useFlavour('postgres')
      .insert()
      .into('"device_lte"')
      .setFields({
        device_id: deviceId,
        imei
      })
      .toParam();
    
      const { rowCount } = await this.pgDbClient.execute(text, values);
      return rowCount > 0;
  }

  public async unlinkDevice(deviceId: string): Promise<boolean> {
    const { text, values } = squel.useFlavour('postgres')
      .delete()
      .from('"device_lte"')
      .where('"device_id" = ?', deviceId)
      .toParam();
    
    const { rowCount } = await this.pgDbClient.execute(text, values);
    return rowCount > 0;
  }
}

export default DeviceLteTable;