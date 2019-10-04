import { injectable } from 'inversify';
import { memoized, MemoizeMixin } from '../../memoize/MemoizeMixin';
import { LookupItemRecord } from './LookupItemRecord';
import { LookupTable } from './LookupTable';

@injectable()
class MemoizedLookupTable extends MemoizeMixin(LookupTable) {

  @memoized()
  public async getLookups(ids: string[] = [], prefixes: string[] = [], lang?: string): Promise<LookupItemRecord[]> {
    return super.getLookups(ids, prefixes, lang);
  }
}

export default MemoizedLookupTable;