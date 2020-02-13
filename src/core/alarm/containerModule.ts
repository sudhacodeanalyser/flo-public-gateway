import { ContainerModule, interfaces } from 'inversify';
import { AlarmService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AlarmService>('AlarmService').to(AlarmService);
});
