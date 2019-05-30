import { ContainerModule, interfaces } from 'inversify';
import { PairingService } from './pairing/PairingService';
import { UserRegistrationService } from './user-registration/UserRegistrationService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<PairingService>('PairingService').to(PairingService);
  bind<UserRegistrationService>('UserRegistrationService').to(UserRegistrationService);
});