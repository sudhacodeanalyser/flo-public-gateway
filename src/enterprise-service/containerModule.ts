import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { EnterpriseService } from './EnterpriseService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('EnterpriseServiceURL').toConstantValue(config.enterpriseServiceUrl);
  bind<EnterpriseService>('EnterpriseService').to(EnterpriseService);
});