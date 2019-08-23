import { ContainerModule, interfaces } from 'inversify';
import FloDetectResultTable from './FloDetectResultTable';
import FloDetectEventChronologyTable from './FloDetectEventChronologyTable';
import { FloDetectService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<FloDetectResultTable>('FloDetectResultTable').to(FloDetectResultTable);
  bind<FloDetectEventChronologyTable>('FloDetectEventChronologyTable').to(FloDetectEventChronologyTable);
  bind<FloDetectService>('FloDetectService').to(FloDetectService);
});