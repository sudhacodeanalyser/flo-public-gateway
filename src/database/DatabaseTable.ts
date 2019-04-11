import DatabaseClient, { Patch, KeyMap } from './DatabaseClient';

export default class DatabaseTable<T> {
  constructor(
    protected dbClient: DatabaseClient,
    public tableName: string
  ) {}

  public get(key: KeyMap): Promise<T> {
    return this.dbClient.get<T>(this.tableName, key);
  }

  public put(item: T): Promise<T> {
    return this.dbClient.put<T>(this.tableName, item);
  }

  public update(key: KeyMap, patch: Patch): Promise<T> {
    return this.dbClient.update<T>(this.tableName, key, patch);
  }

  public remove(key: KeyMap): Promise<void> {
    return this.dbClient.remove(this.tableName, key);
  }
}