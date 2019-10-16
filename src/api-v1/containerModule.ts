import { ContainerModule, interfaces } from 'inversify';
import { PairingService } from './pairing/PairingService';
import { ApiV1UserRegistrationService } from './user-registration/ApiV1UserRegistrationService';
import { UserRegistrationService } from '../core/user/UserRegistrationService';
import { ApiV1PasswordResetService } from './password-reset/ApiV1PasswordResetService';
import { PasswordResetService } from '../core/user/PasswordResetService';
import config from '../config/config';
import { DeviceSystemModeServiceFactory } from '../core/device/DeviceSystemModeService';
import { ApiV1DeviceSystemModeServiceFactory } from './device-system-mode/ApiV1DeviceSystemModeServiceFactory';
import { DirectiveServiceFactory } from '../core/device/DirectiveService';
import { ApiV1DirectiveServiceFactory } from './directive/ApiV1DirectiveServiceFactory';
import { IrrigationScheduleServiceFactory, IrrigationScheduleService } from '../core/device/IrrigationScheduleService';
import { ApiV1IrrigationScheduleServiceFactory } from './irrigation-schedule/ApiV1IrrigationScheduleServiceFactory';
import { ApiV1IrrigationScheduleService } from './irrigation-schedule/ApiV1IrrigationScheduleService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<PairingService>('PairingService').to(PairingService);
  bind<UserRegistrationService>('UserRegistrationService').to(ApiV1UserRegistrationService);
  bind<PasswordResetService>('PasswordResetService').to(ApiV1PasswordResetService);
  bind<DeviceSystemModeServiceFactory>('DeviceSystemModeServiceFactory').to(ApiV1DeviceSystemModeServiceFactory);
  bind<DirectiveServiceFactory>('DirectiveServiceFactory').to(ApiV1DirectiveServiceFactory);
  bind<ApiV1IrrigationScheduleService>('ApiV1IrrigationScheduleService').to(ApiV1IrrigationScheduleService);
  bind<IrrigationScheduleServiceFactory>('IrrigationScheduleServiceFactory').to(ApiV1IrrigationScheduleServiceFactory);
  bind<(apiV1Url: string, authToken: string) => IrrigationScheduleService>('Factory<IrrigationScheduleService>').toFactory((context: interfaces.Context) => {
    return (apiV1Url: string, authToken: string) => {
      const irrigationScheduleService = context.container.get<ApiV1IrrigationScheduleService>('ApiV1IrrigationScheduleService');

      irrigationScheduleService.apiV1Url = apiV1Url;
      irrigationScheduleService.authToken = authToken;

      return irrigationScheduleService;
    };
  })
});