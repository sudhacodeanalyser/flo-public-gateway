import { ContainerModule, interfaces } from 'inversify';
import { FloDetectService } from '../service';
import { FloDetectApi } from './FloDetectApi';
import config from '../../config/config';
import { FloDetectResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<FloDetectService>('FloDetectService').to(FloDetectService);
  bind<FloDetectApi>('FloDetectApi').to(FloDetectApi);
  bind<string>('FloDetectApiUrl').toConstantValue(config.floDetectApiUrl);
  bind<FloDetectResolver>('FloDetectResolver').to(FloDetectResolver);
});