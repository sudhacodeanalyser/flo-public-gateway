import { ContainerModule, interfaces } from 'inversify';
import { AccountService } from '../service';
import AccountTable from './AccountTable';
import { AccountResolver } from '../resolver';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<AccountTable>('AccountTable').to(AccountTable);
  bind<AccountResolver>('AccountResolver').to(AccountResolver);
  bind<AccountService>('AccountService').to(AccountService);
});