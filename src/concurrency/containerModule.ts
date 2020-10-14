import { ContainerModule, interfaces } from 'inversify';
import ConcurrencyService from './ConcurrencyService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<ConcurrencyService>('ConcurrencyService').to(ConcurrencyService);
});