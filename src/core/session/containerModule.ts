import { ContainerModule, interfaces } from 'inversify';
import { SessionService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SessionService>('SessionService').to(SessionService);
});