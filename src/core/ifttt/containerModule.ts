import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import TriggerIdentityLogTable from './TriggerIdentityLogTable';
import IFTTTAuthMiddlewareFactory from './IFTTTAuthMiddlewareFactory';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('IFTTTServiceKey').toConstantValue(config.iftttServiceKey);
  bind<TriggerIdentityLogTable>('TriggerIdentityLogTable').to(TriggerIdentityLogTable);
  bind<IFTTTAuthMiddlewareFactory>('IFTTTAuthMiddlewareFactory').to(IFTTTAuthMiddlewareFactory);
});
