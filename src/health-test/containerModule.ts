import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { HealthTestServiceFactory } from '../core/device/HealthTestService';
import { DefaultHealthTestServiceFactory } from './DefaultHealthTestServiceFactory';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('healthTestServiceUrl').toConstantValue(config.healthTestServiceUrl);
  bind<HealthTestServiceFactory>('HealthTestServiceFactory').to(DefaultHealthTestServiceFactory);
});