import { ContainerModule, interfaces } from 'inversify';
import DeviceService from './DeviceService';
import DeviceTable from './DeviceTable';
import { DeviceResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DeviceService>('DeviceService').to(DeviceService);
  bind<DeviceTable>('DeviceTable').to(DeviceTable);
  bind<DeviceResolver>('DeviceResolver').to(DeviceResolver);
});