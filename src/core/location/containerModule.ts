import { ContainerModule, interfaces } from 'inversify';
import LocationTable from './LocationTable';
import { LocationResolver, LocationUserResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LocationTable>('LocationTable').to(LocationTable);
  bind<LocationResolver>('LocationResolver').to(LocationResolver);
  bind<LocationUserResolver>('LocationUserResolver').to(LocationUserResolver);
});