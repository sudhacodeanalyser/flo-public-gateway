import { ContainerModule, interfaces } from 'inversify';
import { DeviceResolver } from '../resolver';
import { DeviceService, LteService, PuckTokenService } from '../service';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import DeviceTable from './DeviceTable';
import MemoizedDeviceTable from './MemoizedDeviceTable';
import OnboardingLogTable from './OnboardingLogTable';
import MemoizedOnboardingLogTable from './MemoizedOnboardingLogTable';
import PuckTokenMetadataTable from './PuckTokenMetadataTable';
import config from '../../config/config';
import PairInitTable from './PairInitTable';
import LteTable from './LteTable';
import DeviceLteTable from './DeviceLteTable';
import { DeviceSyncService } from './DeviceSyncService';

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
  bind<LteService>('LteService').to(LteService);
  bind<LteTable>('LteTable').to(LteTable);
  bind<DeviceLteTable>('DeviceLteTable').to(DeviceLteTable);
  bind<DeviceSyncService>('DeviceSyncService').to(DeviceSyncService);
});