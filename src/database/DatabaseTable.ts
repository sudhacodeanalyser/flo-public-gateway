import { injectable, unmanaged } from 'inversify';
import DatabaseClient, { KeyMap } from './DatabaseClient';
import { Patch } from './Patch';

@injectable()
class DatabaseTable<T> {
  constructor(
    @unmanaged() protected dbClient: DatabaseClient,
    @unmanaged() public tableName: string
  ) {}

  public async get(key: KeyMap): Promise<T | null> {
    return this.dbClient.get<T>(this.tableName, key);
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

  public async query<Q>(queryOptions: Q): Promise<T[]> {
    return this.dbClient.query<Q, T>(this.tableName, queryOptions);
  }
}

export default DatabaseTable;