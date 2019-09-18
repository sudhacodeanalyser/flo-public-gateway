import { injectable } from 'inversify';
import UserTable from './UserTable';
import { UserRecordData } from './UserRecord';
import { CacheMixin, cached, cacheKey, dropCache, updateCache } from '../../cache/CacheMixin';
import { KeyMap } from '../../database/DatabaseClient';
import { Patch } from '../../database/Patch';

@injectable()
class CachedUserTable extends CacheMixin(UserTable) {

  @cached('User')
  public async get(@cacheKey(({ id }) => id) key: KeyMap): Promise<UserRecordData | null> {

    return super.get(key);
  }

  @updateCache('User')
  public async update(@cacheKey(({ id }) => id) key: KeyMap, patch: Patch): Promise<UserRecordData> {

    return super.update(key, patch);
  }

  @dropCache('User')
  public async remove(@cacheKey(({ id }) => id) key: KeyMap): Promise<void> {

    return super.remove(key);
  }

  @updateCache('User')
  public async put(@cacheKey(({ id }) => id) record: UserRecordData): Promise<UserRecordData> {
    
    return super.put(record);
  }
}

export default CachedUserTable;