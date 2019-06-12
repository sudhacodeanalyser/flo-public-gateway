import { ContainerModule, interfaces } from 'inversify';
import { DeviceService } from '../service';
import DeviceTable from './DeviceTable';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import { DeviceResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DeviceService>('DeviceService').to(DeviceService);
  bind<DeviceTable>('DeviceTable').to(DeviceTable);
  bind<DeviceForcedSystemModeTable>('DeviceForcedSystemModeTable').to(DeviceForcedSystemModeTable);
  bind<DeviceResolver>('DeviceResolver').to(DeviceResolver);
});