import { inject, injectable } from 'inversify';
import LocationTable from './LocationTable';
import { LocationRecordData } from './LocationRecord';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';
import { CacheMixin, cached, cacheKey, updateCache, dropCache } from '../../cache/CacheMixin';
import { KeyMap } from '../../database/DatabaseClient';
import { Patch } from '../../database/Patch';

@injectable()
class MemoizedLocationTable extends MemoizeMixin(CacheMixin(LocationTable)) {

  @memoized()
  @cached('Location')
  public async getByLocationId(@cacheKey() locationId: string): Promise<LocationRecordData | null> {
    return super.getByLocationId(locationId);
  }

  @memoized()
  public async getAllByAccountId(accountId: string): Promise<LocationRecordData[]> {
    return super.getAllByAccountId(accountId);
  }

  @updateCache('Location')
  public async update(@cacheKey(({ location_id }) => location_id) key: KeyMap, patch: Patch): Promise<LocationRecordData> {
    const result = await super.update(key, patch);

    this.clearMethodLoader('getByLocationId', result.location_id);
    this.clearMethodLoader('getAllByAccountId', result.account_id);

    return result;
  }

  @dropCache('Location')
  public async remove(@cacheKey(({ location_id }) => location_id) key: KeyMap): Promise<void> {
    return super.remove(key);
  }

  @updateCache('Location')
  public async put(@cacheKey(({ location_id }) => location_id) record: LocationRecordData): Promise<LocationRecordData> {
    return super.put(record);
  }
}

export default MemoizedLocationTable;