import { ContainerModule, interfaces } from 'inversify';
import { DeviceResolver } from '../resolver';
import { DeviceService, PuckTokenService } from '../service';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import DeviceTable from './DeviceTable';
import MemoizedDeviceTable from './MemoizedDeviceTable';
import OnboardingLogTable from './OnboardingLogTable';
import MemoizedOnboardingLogTable from './MemoizedOnboardingLogTable';
import PuckTokenMetadataTable from './PuckTokenMetadataTable';
import config from '../../config/config';
import PairInitTable from './PairInitTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DeviceService>('DeviceService').to(DeviceService);
  bind<DeviceTable>('DeviceTable').to(MemoizedDeviceTable);
  bind<DeviceForcedSystemModeTable>('DeviceForcedSystemModeTable').to(DeviceForcedSystemModeTable);
  bind<DeviceResolver>('DeviceResolver').to(DeviceResolver);
  bind<OnboardingLogTable>('OnboardingLogTable').to(MemoizedOnboardingLogTable);
  bind<PuckTokenService>('PuckTokenService').to(PuckTokenService);
  bind<PuckTokenMetadataTable>('PuckTokenMetadataTable').to(PuckTokenMetadataTable);
  bind<number>('PuckPairingTokenTTL').toConstantValue(7200); // Two hours
  bind<string>('PuckTokenSecret').toConstantValue(config.puckTokenSecret);
  bind<PairInitTable>('PairInitTable').to(PairInitTable);
  bind<number>('PairInitTTL').toConstantValue(config.pairInitTTL);
});