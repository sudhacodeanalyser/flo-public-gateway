import { ContainerModule, interfaces } from 'inversify';
import FloDetectResultTable from './FloDetectResultTable';
import FloDetectEventChronologyTable from './FloDetectEventChronologyTable';
import { FloDetectService } from '../service';
import { FloDetectApi } from './FloDetectApi';
import config from '../../config/config';
import { FloDetectResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<FloDetectResultTable>('FloDetectResultTable').to(FloDetectResultTable);
  bind<FloDetectEventChronologyTable>('FloDetectEventChronologyTable').to(FloDetectEventChronologyTable);
  bind<FloDetectService>('FloDetectService').to(FloDetectService);
  bind<FloDetectApi>('FloDetectApi').to(FloDetectApi);
  bind<string>('FloDetectApiUrl').toConstantValue(config.floDetectApiUrl);
  bind<FloDetectResolver>('FloDetectResolver').to(FloDetectResolver);
});