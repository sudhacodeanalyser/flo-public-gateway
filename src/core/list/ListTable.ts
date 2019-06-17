import { inject, injectable } from 'inversify';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { DatabaseReadClient } from '../../database/DatabaseClient';
import squel from 'squel';
import { ListItemState, ListItemRecord } from './ListItemRecord';

@injectable()
class ListTable extends PostgresTable<ListItemRecord> {
  constructor(
    @inject('PostgresDbClient') databaseClient: DatabaseReadClient
  ) {
    super(databaseClient, 'list');
  }

  public async getLists(ids: string[]): Promise<ListItemRecord[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .where('list_id IN ?', ids)
      .where('"state" = ?', ListItemState.ENABLED)
      .order('list_id')
      .order('"order"');

    return this.query({ query });
  }

}

export { ListTable };