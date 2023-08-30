import { injectable, unmanaged } from 'inversify';
import DatabaseClient, { KeyMap } from './DatabaseClient';
import { Patch } from './Patch';
import { DatabaseReadTable } from './DatabaseReadTable';
import * as _ from 'lodash';
import ResourceDoesNotExistError from '../core/api/error/ResourceDoesNotExistError';

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

    if (
      _.isEmpty(patch) ||
      (_.isEmpty(patch.setOps) && _.isEmpty(patch.appendOps) && _.isEmpty(patch.removeOps))
    ) {
      const item = await this.get(key);

      if (item === null) {
        throw new ResourceDoesNotExistError();
      }

      return item;
    }

    return this.dbClient.update<T>(this.tableName, key, patch);
  }

  public async remove(key: KeyMap): Promise<void> {
    return this.dbClient.remove(this.tableName, key);
  }

  public async scan(limit: number, exclusiveStartKey?: KeyMap): Promise<{ items: T[], lastEvaluatedKey?: KeyMap}> {
    return this.dbClient.scan(this.tableName, limit, exclusiveStartKey);
  }
}

export default DatabaseTable;
