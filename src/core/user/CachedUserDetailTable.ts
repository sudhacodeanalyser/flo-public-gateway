import { injectable } from 'inversify';
import UserDetailTable from './UserDetailTable';
import { UserDetailRecordData } from './UserDetailRecord';
import { CacheMixin, cached, cacheKey, dropCache, updateCache } from '../../cache/CacheMixin';
import { KeyMap } from '../../database/DatabaseClient';
import { Patch } from '../../database/Patch';

@injectable()
class CachedUserDetailTable extends CacheMixin(UserDetailTable) {

  @cached('UserDetail')
  public async get(@cacheKey(({ user_id }) => user_id) key: KeyMap): Promise<UserDetailRecordData | null> {

    return super.get(key);
  }

  @updateCache('UserDetail')
  public async update(@cacheKey(({ user_id }) => user_id) key: KeyMap, patch: Patch): Promise<UserDetailRecordData> {

    return super.update(key, patch);
  }

  @dropCache('UserDetail')
  public async remove(@cacheKey(({ user_id }) => user_id) key: KeyMap): Promise<void> {

    return super.remove(key);
  }

  @updateCache('UserDetail')
  public async put(@cacheKey(({ user_id }) => user_id) record: UserDetailRecordData): Promise<UserDetailRecordData> {
    
    return super.put(record);
  }
}

export default CachedUserDetailTable;