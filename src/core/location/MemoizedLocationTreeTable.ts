import { injectable } from 'inversify';
import { LocationTreeRow } from './LocationTreeTable';
import CachedLocationTreeTable from './CachedLocationTreeTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

@injectable()
class MemoizedLocationTreeTable extends MemoizeMixin(CachedLocationTreeTable) {

  @memoized((args: any[]) => args)
  public async getImmediateChildren(...args: any[]): Promise<LocationTreeRow[]> {
    const [[accountId, id]] = args;
    return super.getImmediateChildren(accountId, id);
  }

  @memoized((args: any[]) => args)
  public async getAllChildren(...args: any[]): Promise<LocationTreeRow[]> {
   const [[accountId, id]] = args;
   return super.getAllChildren(accountId, id);
  }

  @memoized((args: any[]) => [args[0], (args[1] || []).sort()])
  public async batchGetAllChildren(...args: any[]): Promise<LocationTreeRow[]> {
    const [[accountId, ids]] = args;
    const result = await super.batchGetAllChildren(accountId, ids);

    return result;
  }

  @memoized((args: any[]) => args)
  public async getAllParents(...args: any[]): Promise<LocationTreeRow[]> {
     const [[accountId, id]] = args;

     return super.getAllParents(accountId, id); 
  }
}

export default MemoizedLocationTreeTable;