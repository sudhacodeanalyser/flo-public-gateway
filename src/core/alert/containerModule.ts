import { ContainerModule, interfaces } from 'inversify';
import AlertFeedbackTable from './AlertFeedbackTable';
import { AlertService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AlertFeedbackTable>('AlertFeedbackTable').to(AlertFeedbackTable);
  bind<AlertService>('AlertService').to(AlertService);
});