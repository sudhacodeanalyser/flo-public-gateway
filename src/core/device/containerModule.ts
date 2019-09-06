import { ContainerModule, interfaces } from 'inversify';
import { DeviceResolver } from '../resolver';
import { DeviceService } from '../service';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import DeviceTable from './DeviceTable';
import MemoizedDeviceTable from './MemoizedDeviceTable';
import OnboardingLogTable from './OnboardingLogTable';
import MemoizedOnboardingLogTable from './MemoizedOnboardingLogTable';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DeviceService>('DeviceService').to(DeviceService);
  bind<DeviceTable>('DeviceTable').to(MemoizedDeviceTable);
  bind<DeviceForcedSystemModeTable>('DeviceForcedSystemModeTable').to(DeviceForcedSystemModeTable);
  bind<DeviceResolver>('DeviceResolver').to(DeviceResolver);
  bind<OnboardingLogTable>('OnboardingLogTable').to(MemoizedOnboardingLogTable);
  bind<string>('TelemetryKafkaTopic').toConstantValue(config.telemetryKafkaTopic);
});