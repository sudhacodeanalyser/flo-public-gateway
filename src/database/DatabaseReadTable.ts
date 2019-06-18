import { injectable, unmanaged } from 'inversify';
import { KeyMap, DatabaseReadClient } from './DatabaseClient';

@injectable()
class DatabaseReadTable<T> {

  constructor(
    @unmanaged() protected dbClient: DatabaseReadClient,
    @unmanaged() public tableName: string
  ) {}

  public async get(key: KeyMap): Promise<T | null> {
    return this.dbClient.get<T>(this.tableName, key);
  }

  public async query<Q>(queryOptions: Q): Promise<T[]> {
    return this.dbClient.query<Q, T>(this.tableName, queryOptions);
  }
}

export { DatabaseReadTable };