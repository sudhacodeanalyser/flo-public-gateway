import { ContainerModule, interfaces } from 'inversify';
import AccountService from './AccountService';
import AccountDynamoDBTable from './AccountDynamoDBTable';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<AccountDynamoDBTable>('AccountDynamoDBTable').to(AccountDynamoDBTable);
  bind<AccountService>('AccountService').to(AccountService);

});