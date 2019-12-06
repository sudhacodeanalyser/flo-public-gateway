import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { HealthTestServiceFactory, HealthTestService } from '../core/device/HealthTestService';
import { DefaultHealthTestServiceFactory } from './DefaultHealthTestServiceFactory';
import { DefaultHealthTestService } from './DefaultHealthTestService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('healthTestServiceUrl').toConstantValue(config.healthTestServiceUrl);
  bind<HealthTestServiceFactory>('HealthTestServiceFactory').to(DefaultHealthTestServiceFactory);
  bind<DefaultHealthTestService>('DefaultHealthTestService').to(DefaultHealthTestService);
  bind<(url: string, authToken: string) => HealthTestService>('Factory<HealthTestService>').toFactory((context: interfaces.Context) => {
    return (url: string, authToken: string) => {
      const healthTestService = context.container.get<DefaultHealthTestService>('DefaultHealthTestService');

      healthTestService.healthTestServiceUrl = url;
      healthTestService.authToken = authToken;

      return healthTestService;
    }
  });
});