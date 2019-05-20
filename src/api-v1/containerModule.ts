import { ContainerModule, interfaces } from 'inversify';
import { ApiV1PairingService } from './ApiV1PairingService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<ApiV1PairingService>('ApiV1PairingService').to(ApiV1PairingService);
});