import { ContainerModule, interfaces } from 'inversify';
import AccountService from './AccountService';
import AccountDAO from './AccountDAO';

export default new ContainerModule((bind: interfaces.Bind) => {
 
  bind<AccountDAO>('AccountDAO').to(AccountDAO);
  bind<AccountService>('AccountService').to(AccountService);
  
});