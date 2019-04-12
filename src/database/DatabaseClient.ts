export default interface DatabaseClient {
  put<T>(tableName: string, item: T): Promise<T>
  get<T>(tableName: string, key: KeyMap): Promise<T | null>
  update<T>(tableName: string, key: KeyMap, patch: Patch): Promise<T>
  remove(tableName: string, key: KeyMap): Promise<void>
}

export interface SetOp {
  key: string,
  value: any
}

export interface RemoveOp {
  key: string
}

export interface AppendOp {
  key: string,
  value: any
}

export interface Patch {
  setOps?: SetOp[],
  removeOps?: RemoveOp[],
  appendOps?: AppendOp[]
}

export type KeyMap = { [key: string]: any }
