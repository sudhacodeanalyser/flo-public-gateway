import { ContainerModule, interfaces } from 'inversify';
import AccountService from './AccountService';
import AccountTable from './AccountTable';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<AccountTable>('AccountTable').to(AccountTable);
  bind<AccountService>('AccountService').to(AccountService);

});