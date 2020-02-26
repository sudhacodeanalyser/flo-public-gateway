import { injectable } from 'inversify';
import LocationTreeTable, { LocationTreeRow } from './LocationTreeTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

@injectable()
class MemoizedLocationTreeTable extends MemoizeMixin(LocationTreeTable) {

  @memoized()
  public async getImmediateChildren(id: string): Promise<LocationTreeRow[]> {
    return super.getImmediateChildren(id);
  }

  @memoized()
  public async getAllChildren(id: string): Promise<LocationTreeRow[]> {
    return super.getImmediateChildren(id);
  }

  @memoized((args: any[]) => (args[0] || []).sort())
  public async batchGetAllChildren(ids: string[]): Promise<LocationTreeRow[]> {
    return super.batchGetAllChildren(ids);
  }

  @memoized()
  public async getAllParents(id: string): Promise<LocationTreeRow[]> {
     return super.getAllParents(id); 
  }
}

export default MemoizedLocationTreeTable;