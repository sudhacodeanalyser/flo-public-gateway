import { ContainerModule, interfaces } from 'inversify';
import { ResourceEventService } from '../service';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ResourceEventApiUrl').toConstantValue(config.resourceEventApiUrl);
  bind<ResourceEventService>('ResourceEventService').to(ResourceEventService);
  bind<string>('ResourceEventKafkaTopic').toConstantValue(config.resourceEventKafkaTopic);
});