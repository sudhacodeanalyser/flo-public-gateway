import { injectable } from 'inversify';
import { memoized, MemoizeMixin } from '../../memoize/MemoizeMixin';
import { LookupItemRecord } from './LookupItemRecord';
import { LookupTable } from './LookupTable';

@injectable()
class MemoizedLookupTable extends MemoizeMixin(LookupTable) {

  public async getLookups(ids: string[] = [], prefixes: string[] = [], lang?: string): Promise<LookupItemRecord[]> {
    return this.getMemoizedLookups({ ids, prefixes, lang });
  }

  // TODO: Make memozied functions work properly with multi-argument functions.
  // This is a hack to get around the fact that memoized functions are currently restricted to single argument.
  @memoized((args: any[]) => ({ 
    ids: args[0] && args[0].ids && args[0].ids.sort(), 
    prefixes: args[0] && args[0].prefixes && args[0].prefixes.sort(), 
    lang: args[0] && args[0].lang
  }))
  public async getMemoizedLookups({ ids, prefixes, lang }: { ids?: string[], prefixes?: string[], lang?: string }): Promise<LookupItemRecord[]> {
    return super.getLookups(ids, prefixes, lang);
  }
}

export default MemoizedLookupTable;