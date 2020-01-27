import { ContainerModule, interfaces } from 'inversify';
import AlertFeedbackFlowTable from './AlertFeedbackFlowTable';

import { AlarmService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AlertFeedbackFlowTable>('AlertFeedbackFlowTable').to(AlertFeedbackFlowTable);
  bind<AlarmService>('AlarmService').to(AlarmService);
});
