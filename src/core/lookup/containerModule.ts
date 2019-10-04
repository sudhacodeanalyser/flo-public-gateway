import { ContainerModule, interfaces } from 'inversify';
import { LookupService } from '../service';
import { LookupTable } from './LookupTable';
import MemoizedLookupTable from './MemoizedLookupTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LookupTable>('LookupTable').to(MemoizedLookupTable);
  bind<LookupService>('LookupService').to(LookupService);
});