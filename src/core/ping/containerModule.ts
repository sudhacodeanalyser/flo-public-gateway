import { ContainerModule, interfaces } from 'inversify';
import PingService from './PingService';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<PingService>('PingService').to(PingService);

});