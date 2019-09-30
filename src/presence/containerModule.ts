import { ContainerModule, interfaces } from 'inversify';
import { ApiExternalPresenceService } from './ApiExternalPresenceService';
import { ExternalPresenceService } from '../core/presence/ExternalPresenceService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<ExternalPresenceService>('ExternalPresenceService').to(ApiExternalPresenceService);
  bind<string>('PresenceServiceUrl').toConstantValue(config.presenceServiceUrl);
});