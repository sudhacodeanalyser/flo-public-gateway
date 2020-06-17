import { ContainerModule, interfaces } from 'inversify';
import { HeadsUpService } from './HeadsUpService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<HeadsUpService>('HeadsUpService').to(HeadsUpService);
});