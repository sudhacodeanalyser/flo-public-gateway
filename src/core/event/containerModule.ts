import { ContainerModule, interfaces } from 'inversify';
import { EventService } from './EventService';
import EventTable from './EventTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<EventService>('EventService').to(EventService);
  bind<EventTable>('EventTable').to(EventTable);
});
