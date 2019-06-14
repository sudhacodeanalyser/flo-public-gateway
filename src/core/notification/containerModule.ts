import { ContainerModule, interfaces } from 'inversify';
import { NotificationService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<NotificationService>('NotificationService').to(NotificationService);
});