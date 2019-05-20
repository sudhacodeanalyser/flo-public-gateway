import { ContainerModule, interfaces } from 'inversify';
import PresenseService from './PresenseService';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<PresenseService>('PresenseService').to(PresenseService);

});