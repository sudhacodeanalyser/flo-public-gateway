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
import { IrrigationScheduleServiceFactory, IrrigationScheduleService } from '../core/device/IrrigationScheduleService';
import { ApiV1IrrigationScheduleServiceFactory } from './irrigation-schedule/ApiV1IrrigationScheduleServiceFactory';
import { ApiV1IrrigationScheduleService } from './irrigation-schedule/ApiV1IrrigationScheduleService';
import { ApiV1DeviceSystemModeService } from './device-system-mode/ApiV1DeviceSystemModeService';
import { ApiV1DirectiveService } from './directive/ApiV1DirectiveService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<PairingService>('PairingService').to(PairingService);
  bind<UserRegistrationService>('UserRegistrationService').to(ApiV1UserRegistrationService);
  bind<PasswordResetService>('PasswordResetService').to(ApiV1PasswordResetService);
  bind<DeviceSystemModeServiceFactory>('DeviceSystemModeServiceFactory').to(ApiV1DeviceSystemModeServiceFactory);
  bind<DirectiveServiceFactory>('DirectiveServiceFactory').to(ApiV1DirectiveServiceFactory);
  bind<ApiV1IrrigationScheduleService>('ApiV1IrrigationScheduleService').to(ApiV1IrrigationScheduleService);
  bind<IrrigationScheduleServiceFactory>('IrrigationScheduleServiceFactory').to(ApiV1IrrigationScheduleServiceFactory);
  bind<ApiV1DeviceSystemModeService>('ApiV1DeviceSystemModeService').to(ApiV1DeviceSystemModeService);
  bind<(apiV1Url: string, authToken: string) => IrrigationScheduleService>('Factory<IrrigationScheduleService>').toFactory((context: interfaces.Context) => {
    return (apiV1Url: string, authToken: string) => {
      const irrigationScheduleService = context.container.get<ApiV1IrrigationScheduleService>('ApiV1IrrigationScheduleService');

      irrigationScheduleService.apiV1Url = apiV1Url;
      irrigationScheduleService.authToken = authToken;

      return irrigationScheduleService;
    };
  })
 bind<(apiV1Url: string, authToken: string) => DeviceSystemModeService>('Factory<DeviceSystemModeService>').toFactory((context: interfaces.Context) => {
   return (apiV1Url: string, authToken: string) => {
      const deviceSystemModeService = context.container.get<ApiV1DeviceSystemModeService>('ApiV1DeviceSystemModeService');

      deviceSystemModeService.apiV1Url = apiV1Url;
      deviceSystemModeService.authToken = authToken;

      return deviceSystemModeService;
   }
 });
 bind<ApiV1DirectiveService>('ApiV1DirectiveService').to(ApiV1DirectiveService);
 bind<(apiV1Url: string, authToken: string) => DirectiveService>('Factory<DirectiveService>').toFactory((context: interfaces.Context) => {
   return (apiV1Url: string, authToken: string) => {
      const directiveService = context.container.get<ApiV1DirectiveService>('ApiV1DirectiveService');

      directiveService.apiV1Url = apiV1Url;
      directiveService.authToken = authToken;

      return directiveService;
   }  
 });
});