import { ContainerModule, interfaces } from 'inversify';
import DeviceService from './DeviceService';
import DeviceTable from './DeviceTable';
import DeviceDao from './DeviceDao';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DeviceService>('DeviceService').to(DeviceService);
  bind<DeviceTable>('DeviceTable').to(DeviceTable);
  bind<DeviceDao>('DeviceDao').to(DeviceDao);
});