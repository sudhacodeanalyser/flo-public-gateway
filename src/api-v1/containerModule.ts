import { ContainerModule, interfaces } from 'inversify';
import { PairingService } from './pairing/PairingService';
import { ApiV1UserRegistrationService } from './user-registration/ApiV1UserRegistrationService';
import { UserRegistrationService } from '../core/user/UserRegistrationService';
import { ApiV1PasswordResetService } from './password-reset/ApiV1PasswordResetService';
import { PasswordResetService } from '../core/user/PasswordResetService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<PairingService>('PairingService').to(PairingService);
  bind<UserRegistrationService>('UserRegistrationService').to(ApiV1UserRegistrationService);
  bind<PasswordResetService>('PasswordResetService').to(ApiV1PasswordResetService);
});