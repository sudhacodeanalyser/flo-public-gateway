import { ContainerModule, interfaces } from 'inversify';
import { HealthTestService } from '../core/device/HealthTestService';
import { DefaulthHealthTestService } from './DefaultHealthTestService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<HealthTestService>('HealthTestService').to(DefaulthHealthTestService);
});