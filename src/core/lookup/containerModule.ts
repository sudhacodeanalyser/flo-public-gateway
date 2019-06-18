import { ContainerModule, interfaces } from 'inversify';
import { LookupService } from '../service';
import { LookupTable } from './LookupTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LookupService>('LookupService').to(LookupService);
  bind<LookupTable>('LookupTable').to(LookupTable);
});