import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import { UserService } from '../service';
import UserAccountRoleTable from './UserAccountRoleTable';
import UserDetailTable from './UserDetailTable';
import UserLocationRoleTable from './UserLocationRoleTable';
import { UserResolver } from './UserResolver';
import UserTable from './UserTable';
import CachedUserTable from './CachedUserTable';
import CachedUserDetailTable from './CachedUserDetailTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<UserAccountRoleTable>('UserAccountRoleTable').to(UserAccountRoleTable);
  bind<UserLocationRoleTable>('UserLocationRoleTable').to(UserLocationRoleTable);
  bind<UserDetailTable>('UserDetailTable').to(CachedUserDetailTable);
  bind<UserTable>('UserTable').to(CachedUserTable);
  bind<UserResolver>('UserResolver').to(UserResolver);
  bind<UserService>('UserService').to(UserService);
  bind<string>('DefaultUserLocale').toConstantValue(config.defaultUserLocale);
});