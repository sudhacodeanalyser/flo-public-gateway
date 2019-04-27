import { ContainerModule, interfaces } from 'inversify';
import UserAccountRoleTable from './UserAccountRoleTable';
import UserDetailTable from './UserDetailTable';
import UserLocationRoleTable from './UserLocationRoleTable';
import { UserResolver } from './UserResolver';
import UserService from './UserService';
import UserTable from './UserTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<UserAccountRoleTable>('UserAccountRoleTable').to(UserAccountRoleTable);
  bind<UserLocationRoleTable>('UserLocationRoleTable').to(UserLocationRoleTable);
  bind<UserDetailTable>('UserDetailTable').to(UserDetailTable);
  bind<UserTable>('UserTable').to(UserTable);
  bind<UserResolver>('UserResolver').to(UserResolver);
  bind<UserService>('UserService').to(UserService);
});