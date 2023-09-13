import * as _ from 'lodash';
import { inject, injectable, targetName } from 'inversify';
import squel from 'safe-squel';
import * as O from 'fp-ts/lib/Option';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { LteRecord, LteRecordData } from './LteRecord';
import { Lte, LteCreate } from '../api';
import { pipe } from 'fp-ts/lib/pipeable';
import ConflictError from '../api/error/ConflictError';
import { AxiosError } from 'axios';

type Option<T> = O.Option<T>;
const fieldRegex = /.*\((\w+)\)=.*/;

@injectable()
class LteTable extends PostgresTable<LteRecordData> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'lte');
  }

  public async getByQrCode(qrCode: string): Promise<Option<Lte>> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .field('"lte".*')
      .field('"lo".*')
      .from('"lte"')
      .join('"lte_offset"', '"lo"', '"lo"."index" = "lte"."offset_index"')
      .where('"lte"."qr_code" = ?', qrCode)
      .toParam();
    
    const records = await this.pgDbClient.execute(text, values);
    const maybeLteRecordData = O.fromNullable(_.first(records.rows));
    return pipe(
      maybeLteRecordData,
      O.map(lteRecordData => new LteRecord(lteRecordData).toModel())
    );
  }

  public async getByDeviceId(deviceId: string): Promise<Option<Lte>> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .field('"lte".*')
      .field('"lo".*')
      .from('"lte"')
      .join('"device_lte"', undefined, '"device_lte"."imei" = "lte"."imei"')
      .join('"lte_offset"', '"lo"', '"lo"."index" = "lte"."offset_index"')
      .where('"device_lte"."device_id" = ?', deviceId)
      .toParam();
    
    const records = await this.pgDbClient.execute(text, values);
    const maybeLteRecordData = O.fromNullable(_.first(records.rows));
    return pipe(
      maybeLteRecordData,
      O.map(lteRecordData => new LteRecord(lteRecordData).toModel())
    );
  }

  public async create(lte: LteCreate): Promise<void> {
    const { text, values } = squel.useFlavour('postgres')
      .insert()
      .into('lte')
      .setFields({
        imei: lte.imei,
        iccid: lte.iccid,
        rnd_key: lte.randomKey,
        qr_code: lte.qrCode,
        offset_index: lte.offsetIndex
      })
      .toParam();

    try {
      await this.pgDbClient.execute(text, values);
    } catch (err: any) {
      if (err.code === '23505') {
        const field = err.detail.replace(fieldRegex, (m: string, f: string) => f);
        throw new ConflictError(`${field} already exists.`);
      }
      throw err;
    }
  }

  public async getByImei(imei: string): Promise<Option<Lte>> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .field('"lte".*')
      .field('"lo".*')
      .from('"lte"')
      .join('"lte_offset"', '"lo"', '"lo"."index" = "lte"."offset_index"')
      .where('"lte"."imei" = ?', imei)
      .toParam();
    
    const records = await this.pgDbClient.execute(text, values);
    const maybeLteRecordData = O.fromNullable(_.first(records.rows));
    return pipe(
      maybeLteRecordData,
      O.map(lteRecordData => new LteRecord(lteRecordData).toModel())
    );
  }
}

export default LteTable;