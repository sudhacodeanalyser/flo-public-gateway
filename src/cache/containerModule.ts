import { ContainerModule, interfaces } from 'inversify';
import CacheMiddleware from './CacheMiddleware';
import { SymbolFor } from './InjectableHttpContextUtils';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<any>(SymbolFor.InjectableHttpContext).toConstantValue({});
  bind<CacheMiddleware>('CacheMiddleware').to(CacheMiddleware);
});
