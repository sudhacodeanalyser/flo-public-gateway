import { ContainerModule, interfaces } from 'inversify';
import { WaterService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<WaterService>('WaterService').to(WaterService);
});