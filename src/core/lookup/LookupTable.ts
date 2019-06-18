import { inject, injectable } from 'inversify';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { DatabaseReadClient } from '../../database/DatabaseClient';
import squel from 'squel';
import { LookupItemState, LookupItemRecord } from './LookupItemRecord';

@injectable()
class LookupTable extends PostgresTable<LookupItemRecord> {
  constructor(
    @inject('PostgresDbClient') databaseClient: DatabaseReadClient
  ) {
    super(databaseClient, 'lookup');
  }

  public async getLookups(ids: string[]): Promise<LookupItemRecord[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .where('lookup_id IN ?', ids)
      .where('"state" = ?', LookupItemState.ENABLED)
      .order('lookup_id')
      .order('"order"');

    return this.query({ query });
  }

}

export { LookupTable };