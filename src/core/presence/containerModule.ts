import { ContainerModule, interfaces } from 'inversify';
import PresenceService from './PresenceService';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<PresenceService>('PresenceService').to(PresenceService);

});