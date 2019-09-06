import { ContainerModule, interfaces } from 'inversify';
import { EntityActivityService } from '../service';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<EntityActivityService>('EntityActivityService').to(EntityActivityService);
  bind<string>('EntityActivityKafkaTopic').toConstantValue(config.entityActivityKafkaTopic);
});