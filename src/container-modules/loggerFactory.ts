import { ContainerModule, interfaces } from 'inversify';
import LoggerFactory from '../utils/LoggerFactory';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<LoggerFactory>('LoggerFactory').to(LoggerFactory);
});