import { ContainerModule, interfaces } from 'inversify';
import LocationTable from './LocationTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LocationTable>('LocationTable').to(LocationTable);
});