import { inject, injectable } from 'inversify';
import LocationPgTable from './LocationPgTable';
import { LocationPgRecordData, LocationPgPage } from './LocationPgRecord';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';
import { CacheMixin, cached, cacheKey, updateCache, dropCache } from '../../cache/CacheMixin';
import { KeyMap } from '../../database/DatabaseClient';
import { Patch } from '../../database/Patch';

@injectable()
class MemoizedLocationPgTable extends MemoizeMixin(CacheMixin(LocationPgTable)) {

  @memoized()
  // @cached('LocationPg')
  public async get(keys: KeyMap): Promise<LocationPgRecordData | null> {
    return super.get(keys);
  }

  @memoized((args: any[]) => args)
  public async getByAccountId(...args: any[]): Promise<LocationPgPage> {
    const [[accountId, size, page]] = args;
    return super.getByAccountId(accountId, size, page);
  }

  @memoized((args: any[]) => args)
  @cached('LocationPgByUserId', 30)
  public async getByUserId(...args: any[]): Promise<LocationPgPage> {
    const [[userId, size, page, searchText]] = args;
    const results = await super.getByUserId(userId, size, page, searchText);

    results.items
      .forEach(location => {
        this.primeMethodLoader('get', { id: location.id }, location);
        // this.cache(location, 'LocationPg', JSON.stringify({ id: location.id }));       
      });

    return results;
  }

  @memoized((args: any[]) => args)
  @cached('LocationPgByUserIdWithChildren', 30)
  public async getByUserIdWithChildren(...args: any[]): Promise<LocationPgPage> {
    const [[userId, size, page, searchText]] = args;
    const results = await super.getByUserIdWithChildren(userId, size, page, searchText);

    results.items
      .forEach(location => {
        this.primeMethodLoader('get', { id: location.id }, location);
        // this.cache(location, 'LocationPg', JSON.stringify({ id: location.id }));       
      });

    return results;
  }

  @memoized((args: any[]) => args) 
  @cached('LocationPgByUserIdAndClass', 30)
  public async getByUserIdAndClass(...args: any[]): Promise<LocationPgPage> {
    const [[userId, locClass, size, page, searchText]] = args;
    const results = await super.getByUserIdAndClass(userId, locClass, size, page, searchText);

    results.items
      .forEach(location => {
        this.primeMethodLoader('get', { id: location.id }, location);
        // this.cache(location, 'LocationPg', JSON.stringify({ id: location.id }));       
      });

    return results;
  }

  @memoized((args: any[]) => args) 
  @cached('LocationPgByUserIdAndClassWithChildren', 30)
  public async getByUserIdAndClassWithChildren(...args: any[]): Promise<LocationPgPage> {
    const [[userId, locClass, size, page, searchText]] = args;
    const results = await super.getByUserIdAndClassWithChildren(userId, locClass, size, page, searchText);

    results.items
      .forEach(location => {
        this.primeMethodLoader('get', { id: location.id }, location);
        // this.cache(location, 'LocationPg', JSON.stringify({ id: location.id }));       
      });

    return results;
  }
}

export default MemoizedLocationPgTable;