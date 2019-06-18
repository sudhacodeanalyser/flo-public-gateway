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
    super(databaseClient, 'list');
  }

  public async getLookups(ids: string[]): Promise<LookupItemRecord[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .where('list_id IN ?', ids)
      .where('"state" = ?', LookupItemState.ENABLED)
      .order('list_id')
      .order('"order"');

    return this.query({ query });
  }

}

export { LookupTable };