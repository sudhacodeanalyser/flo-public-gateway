import { ContainerModule, interfaces } from 'inversify';
import AuthMiddlewareFactory from './AuthMiddlewareFactory';
import config from '../config/config';
import { AccessControlService } from './AccessControlService';
import { PuckAuthMiddleware } from './PuckAuthMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AuthMiddlewareFactory>('AuthMiddlewareFactory').to(AuthMiddlewareFactory);
  bind<AccessControlService>('AccessControlService').to(AccessControlService);
  bind<string>('AuthUrl').toConstantValue(config.authUrl);
  bind<string>('AclUrl').toConstantValue(config.aclUrl);
  bind<PuckAuthMiddleware>('PuckAuthMiddleware').to(PuckAuthMiddleware);
});