import { ContainerModule, interfaces } from 'inversify';
import MemoizeMiddleware from './MemoizeMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<MemoizeMiddleware>('MemoizeMiddleware').to(MemoizeMiddleware);
});
