import { injectable, unmanaged } from 'inversify';
import DatabaseClient, { KeyMap } from './DatabaseClient';
import { Patch } from './Patch';
import { DatabaseReadTable } from './DatabaseReadTable';

@injectable()
class DatabaseTable<T> extends DatabaseReadTable<T> {
  constructor(
    @unmanaged() protected dbClient: DatabaseClient,
    @unmanaged() public tableName: string
  ) {
    super(dbClient, tableName);
  }

  public async put(item: T): Promise<T> {
    return this.dbClient.put<T>(this.tableName, item);
  }

  public async update(key: KeyMap, patch: Patch): Promise<T> {
    return this.dbClient.update<T>(this.tableName, key, patch);
  }

  public async remove(key: KeyMap): Promise<void> {
    return this.dbClient.remove(this.tableName, key);
  }

}

export default DatabaseTable;