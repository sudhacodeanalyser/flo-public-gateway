import { ContainerModule, interfaces } from 'inversify';
import { PairingService } from './pairing/PairingService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1Url').toConstantValue(config.apiV1Url);
  bind<PairingService>('PairingService').to(PairingService);
});