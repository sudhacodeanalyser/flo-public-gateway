import { ContainerModule, interfaces } from 'inversify';
import { DeviceResolver } from '../resolver';
import { DeviceService } from '../service';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import DeviceTable from './DeviceTable';
import OnboardingLogTable from './OnboardingLogTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DeviceService>('DeviceService').to(DeviceService);
  bind<DeviceTable>('DeviceTable').to(DeviceTable);
  bind<DeviceForcedSystemModeTable>('DeviceForcedSystemModeTable').to(DeviceForcedSystemModeTable);
  bind<DeviceResolver>('DeviceResolver').to(DeviceResolver);
  bind<OnboardingLogTable>('OnboardingLogTable').to(OnboardingLogTable);
});