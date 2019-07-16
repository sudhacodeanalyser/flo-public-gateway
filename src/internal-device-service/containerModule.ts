import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { InternalDeviceService } from './InternalDeviceService';
import { FirestoreAuthService } from '../core/session/FirestoreAuthService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('InternalDeviceServiceBaseUrl').toConstantValue(config.internalDeviceServiceBaseUrl);
  bind<InternalDeviceService>('InternalDeviceService').to(InternalDeviceService);
  bind<FirestoreAuthService>('FirestoreAuthService').to(InternalDeviceService);
});