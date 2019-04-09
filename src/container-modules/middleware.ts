import { ContainerModule, interfaces } from 'inversify';
import LoggerMiddleware from '../middleware/LoggerMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {
  
  bind<LoggerMiddleware>('LoggerMiddleware').to(LoggerMiddleware);

});