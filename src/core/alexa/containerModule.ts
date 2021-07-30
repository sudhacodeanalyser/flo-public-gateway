import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import { AlexaService } from './AlexaService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('InternalFloAlexaSmarthomeUrl').toConstantValue(config.internalFloAlexaSmarthomeUrl);
  bind<AlexaService>('AlexaService').to(AlexaService);
});