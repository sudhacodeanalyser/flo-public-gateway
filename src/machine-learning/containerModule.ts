import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { MachineLearningService } from './MachineLearningService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<MachineLearningService>('MachineLearningService').to(MachineLearningService);
  bind<string>('MachineLearningServiceURL').toConstantValue(config.mlServiceURL);
});