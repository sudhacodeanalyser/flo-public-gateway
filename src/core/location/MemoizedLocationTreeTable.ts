import { injectable } from 'inversify';
import { LocationTreeRow } from './LocationTreeTable';
import CachedLocationTreeTable from './CachedLocationTreeTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

@injectable()
class MemoizedLocationTreeTable extends MemoizeMixin(CachedLocationTreeTable) {

  @memoized((args: any[]) => args[1])
  public async getImmediateChildren(accountId: string, id: string): Promise<LocationTreeRow[]> {
    return super.getImmediateChildren(accountId, id);
  }

  @memoized((args: any[]) => args[1])
  public async getAllChildren(accountId: string, id: string): Promise<LocationTreeRow[]> {
    return super.getImmediateChildren(accountId, id);
  }

  @memoized((args: any[]) => (args[1] || []).sort())
  public async batchGetAllChildren(accountId: string, ids: string[]): Promise<LocationTreeRow[]> {
    return super.batchGetAllChildren(accountId, ids);
  }

  @memoized((args: any[]) => args[1])
  public async getAllParents(accountId: string, id: string): Promise<LocationTreeRow[]> {
     return super.getAllParents(accountId, id); 
  }
}

export default MemoizedLocationTreeTable;