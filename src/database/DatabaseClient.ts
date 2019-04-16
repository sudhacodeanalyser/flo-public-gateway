import { Patch } from './Patch';

export type KeyMap = { [key: string]: any }

export default interface DatabaseClient {
  put<T>(tableName: string, item: T): Promise<T>
  get<T>(tableName: string, key: KeyMap): Promise<T | null>
  update<T>(tableName: string, key: KeyMap, patch: Patch): Promise<T>
  remove(tableName: string, key: KeyMap): Promise<void>,
  query<Q, T>(tableName: string, query: Q): Promise<T[]>
}