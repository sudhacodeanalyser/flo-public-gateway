import { ContainerModule, interfaces } from 'inversify';
import LocationTable from './LocationTable';
import MemoizedLocationTable from './MemoizedLocationTable';
import { LocationService } from '../service';
import { LocationResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LocationTable>('LocationTable').to(MemoizedLocationTable);
  bind<LocationResolver>('LocationResolver').to(LocationResolver);
  bind<LocationService>('LocationService').to(LocationService);
});