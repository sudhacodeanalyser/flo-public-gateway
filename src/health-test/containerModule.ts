import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { HealthTestService } from '../core/device/HealthTestService';
import { DefaulthHealthTestService } from './DefaultHealthTestService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('healthTestServiceUrl').toConstantValue(config.healthTestServiceUrl);
  bind<HealthTestService>('HealthTestService').to(DefaulthHealthTestService);
});