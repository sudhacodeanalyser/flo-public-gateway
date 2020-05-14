import { ContainerModule, interfaces } from 'inversify';
import { LookupService } from '../service';
import { LookupTable } from './LookupTable';
import MemoizedLookupTable from './MemoizedLookupTable';
import { Lookup } from '../api';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LookupTable>('LookupTable').to(MemoizedLookupTable);
  bind<LookupService>('LookupService').to(LookupService);
  bind<Lookup>('ListCache').toConstantValue({});
  bind<Record<string, string | undefined>>('ListCacheTtl').toConstantValue({});
});