import { ContainerModule, interfaces } from 'inversify';
import LocationTable from './LocationTable';
import MemoizedLocationTable from './MemoizedLocationTable';
import { LocationService } from '../service';
import { LocationResolver } from '../resolver';
import LocationTreeTable from './LocationTreeTable';
import MemoizedLocationTreeTable from './MemoizedLocationTreeTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<LocationTable>('LocationTable').to(MemoizedLocationTable);
  bind<LocationResolver>('LocationResolver').to(LocationResolver);
  bind<LocationService>('LocationService').to(LocationService);
  bind<LocationTreeTable>('LocationTreeTable').to(MemoizedLocationTreeTable);
});