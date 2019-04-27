import { ContainerModule, interfaces } from 'inversify';
import LoggerFactory from './LoggerFactory';
import LoggerMiddleware from './LoggerMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<LoggerFactory>('LoggerFactory').to(LoggerFactory);
  bind<LoggerMiddleware>('LoggerMiddleware').to(LoggerMiddleware);

});