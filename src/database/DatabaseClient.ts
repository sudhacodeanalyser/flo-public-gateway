import { Patch } from './Patch';

export type KeyMap = { [key: string]: any }

export interface DatabaseReadClient {
  get<T>(tableName: string, key: KeyMap): Promise<T | null>;
  query<Q extends object, T>(tableName: string, query: Q): Promise<T[]>;
  batchGet<T>(tableName: string, keys: KeyMap[], batchSize?: number): Promise<Array<T | null>>;
}

export default interface DatabaseClient extends DatabaseReadClient {
  put<T>(tableName: string, item: T): Promise<T>;
  update<T>(tableName: string, key: KeyMap, patch: Patch): Promise<T>;
  remove(tableName: string, key: KeyMap): Promise<void>;
  scan<T>(tableName: string, limit: number, exclusiveStartKey?: KeyMap): Promise<{ items: T[], lastEvaluatedKey?: KeyMap}>
}
