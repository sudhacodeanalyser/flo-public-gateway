import { injectable, unmanaged } from 'inversify';
import { DatabaseReadTable } from '../DatabaseReadTable';
import { DatabaseReadClient } from '../DatabaseClient';

@injectable()
class PostgresTable<T> extends DatabaseReadTable<T> {

  constructor(
    @unmanaged() protected databaseClient: DatabaseReadClient,
    @unmanaged() public tableName: string
  ) {
    super(databaseClient, tableName);
  }

}

export { PostgresTable };