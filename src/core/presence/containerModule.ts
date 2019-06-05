import { ContainerModule, interfaces } from 'inversify';
import PresenceService from './PresenceService';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('PresenceKafkaTopic').toConstantValue(config.presenceKafkaTopic);
  bind<PresenceService>('PresenceService').to(PresenceService);

});