import { ContainerModule, interfaces } from 'inversify';
import AlertFeedbackTable from './AlertFeedbackTable';
import { EventService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AlertFeedbackTable>('AlertFeedbackTable').to(AlertFeedbackTable);
  bind<EventService>('EventService').to(EventService);
});