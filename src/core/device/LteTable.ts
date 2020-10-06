import _ from 'lodash';
import { inject, injectable, targetName } from 'inversify';
import squel from 'squel';
import * as O from 'fp-ts/lib/Option';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { LteRecordData } from './LteRecord';

type Option<T> = O.Option<T>;

@injectable()
class LteTable extends PostgresTable<LteRecordData> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'lte');
  }

  public async getByDeviceId(deviceId: string): Promise<Option<LteRecordData>> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .from('"lte"')
      .join('"device_lte"', undefined, '"device_lte"."imei" = "lte"."imei"')
      .where('"device_lte"."device_id" = ?', deviceId)
      .toParam();
    
    const records = await this.pgDbClient.execute(text, values);
    return O.fromNullable(_.first(records.rows));
  }
}

export default LteTable;