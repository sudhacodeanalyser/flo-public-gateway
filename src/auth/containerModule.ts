import { ContainerModule, interfaces } from 'inversify';
import AuthMiddlewareFactory from './AuthMiddlewareFactory';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AuthMiddlewareFactory>('AuthMiddlewareFactory').to(AuthMiddlewareFactory);
  bind<string>('AuthUrl').toConstantValue(config.authUrl);
});