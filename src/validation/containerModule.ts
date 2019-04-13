import { ContainerModule, interfaces } from 'inversify';
import ReqValidationMiddlewareFactory from './ReqValidationMiddlewareFactory';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory').to(ReqValidationMiddlewareFactory);
})