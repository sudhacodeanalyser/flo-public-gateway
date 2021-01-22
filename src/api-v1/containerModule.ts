import { ContainerModule, interfaces } from 'inversify';
import { PairingService } from './pairing/PairingService';
import { ApiV1UserRegistrationService } from './user-registration/ApiV1UserRegistrationService';
import { UserRegistrationService } from '../core/user/UserRegistrationService';
import { ApiV1PasswordResetService } from './password-reset/ApiV1PasswordResetService';
import { PasswordResetService } from '../core/user/PasswordResetService';
import config from '../config/config';
import { DeviceSystemModeServiceFactory, DeviceSystemModeService } from '../core/device/DeviceSystemModeService';
import { ApiV1DeviceSystemModeServiceFactory } from './device-system-mode/ApiV1DeviceSystemModeServiceFactory';
import { DirectiveServiceFactory, DirectiveService } from '../core/device/DirectiveService';
import { ApiV1DirectiveServiceFactory } from './directive/ApiV1DirectiveServiceFactory';
import { IrrigationScheduleService } from '../core/device/IrrigationScheduleService';
import { ApiV1IrrigationScheduleService } from './irrigation-schedule/ApiV1IrrigationScheduleService';
import { ApiV1DeviceSystemModeService } from './device-system-mode/ApiV1DeviceSystemModeService';
import { ApiV1DirectiveService } from './directive/ApiV1DirectiveService';
import { ApiV1LogoutService } from './logout/ApiV1LogoutService';
import { OnboardingService } from '../core/device/OnboardingService';
import { ApiV1OnboardingService } from './onboarding-event/ApiV1OnboardingService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Token').toConstantValue(config.apiV1Token);
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<PairingService>('PairingService').to(PairingService);
  bind<UserRegistrationService>('UserRegistrationService').to(ApiV1UserRegistrationService);
  bind<PasswordResetService>('PasswordResetService').to(ApiV1PasswordResetService);
  bind<DeviceSystemModeServiceFactory>('DeviceSystemModeServiceFactory').to(ApiV1DeviceSystemModeServiceFactory);
  bind<DirectiveServiceFactory>('DirectiveServiceFactory').to(ApiV1DirectiveServiceFactory);
  bind<ApiV1IrrigationScheduleService>('ApiV1IrrigationScheduleService').to(ApiV1IrrigationScheduleService);
  bind<ApiV1DeviceSystemModeService>('ApiV1DeviceSystemModeService').to(ApiV1DeviceSystemModeService);
  bind<ApiV1LogoutService>('ApiV1LogoutService').to(ApiV1LogoutService);
  bind<(apiV1Url: string, authToken: string) => DeviceSystemModeService>('Factory<DeviceSystemModeService>').toFactory((context: interfaces.Context) => {
    return (apiV1Url: string, authToken: string, customHeaders: any) => {
      const deviceSystemModeService = context.container.get<ApiV1DeviceSystemModeService>('ApiV1DeviceSystemModeService');

      deviceSystemModeService.apiV1Url = apiV1Url;
      deviceSystemModeService.authToken = authToken;
      deviceSystemModeService.customHeaders = customHeaders;

      return deviceSystemModeService;
   }
  });
  bind<ApiV1DirectiveService>('ApiV1DirectiveService').to(ApiV1DirectiveService);
  bind<(apiV1Url: string, authToken: string) => DirectiveService>('Factory<DirectiveService>').toFactory((context: interfaces.Context) => {
   return (apiV1Url: string, authToken: string, customHeaders: any) => {
      const directiveService = context.container.get<ApiV1DirectiveService>('ApiV1DirectiveService');

      directiveService.apiV1Url = apiV1Url;
      directiveService.authToken = authToken;
      directiveService.customHeaders = customHeaders;

      return directiveService;
   }
  });
  bind<OnboardingService>('OnboardingService').to(ApiV1OnboardingService);
});

