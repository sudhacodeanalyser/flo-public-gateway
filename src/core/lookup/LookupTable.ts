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

  public async getLookups(ids: string[] = [], prefixes: string[] = []): Promise<LookupItemRecord[]> {
    const idExactMatchClause = ids.length ?
      squel.expr()
        .or('list_id IN ?', ids) :
      squel.expr();
    const idClause = prefixes
      .reduce(
        (expr, prefix) => expr.or(`list_id LIKE '${ prefix }%'`), 
        idExactMatchClause
      );

    const query = squel.useFlavour('postgres')
      .select()
      .where(idClause)
      .where('"state" = ?', LookupItemState.ENABLED)
      .order('list_id')
      .order('"order"')
      .order('short_display')
      .order('key_id');
      
    return this.query({ query });
  }

}

export { LookupTable };