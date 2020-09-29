import { inject, injectable, targetName } from 'inversify';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { LteRecordData } from './LteRecord';

@injectable()
class LteTable extends PostgresTable<LteRecordData> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'lte');
  }
}

export default LteTable;