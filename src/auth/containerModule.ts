import { ContainerModule, interfaces } from 'inversify';
import AuthMiddlewareFactory from './AuthMiddlewareFactory';
import config from '../config/config';
import { AccessControlService } from './AccessControlService';
import { PuckAuthMiddleware } from './PuckAuthMiddleware';
import { AuthCache } from './AuthCache';
import { AccountSyncService } from './moen/AccountSyncService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AuthMiddlewareFactory>('AuthMiddlewareFactory').to(AuthMiddlewareFactory);
  bind<AccessControlService>('AccessControlService').to(AccessControlService);
  bind<AccountSyncService>('AccountSyncService').to(AccountSyncService);
  bind<string>('AuthUrl').toConstantValue(config.authUrl);
  bind<string>('InternalFloMoenAuthUrl').toConstantValue(config.internalFloMoenAuthUrl);
  bind<string>('AclUrl').toConstantValue(config.aclUrl);
  bind<PuckAuthMiddleware>('PuckAuthMiddleware').to(PuckAuthMiddleware);
  bind<AuthCache>('AuthCache').to(AuthCache);
});