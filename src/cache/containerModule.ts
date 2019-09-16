import { ContainerModule, interfaces } from 'inversify';
import CacheMiddleware from './CacheMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<CacheMiddleware>('CacheMiddleware').to(CacheMiddleware);
});
