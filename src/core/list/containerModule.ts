import { ContainerModule, interfaces } from 'inversify';
import { ListService } from '../service';
import { ListTable } from './ListTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<ListService>('ListService').to(ListService);
  bind<ListTable>('ListTable').to(ListTable);
});