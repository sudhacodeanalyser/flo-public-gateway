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
import MemoizedUserLocationRoleTable from './MemoizedUserLocationRoleTable';
import MemoziedUserAccountRoleTable from './MemoizedUserAccountRoleTable';
import { UserInviteService } from './UserRegistrationService';
import UserRegistrationTokenMetadataTable from './UserRegistrationTokenMetadataTable';
import UserLocationPgTable from './UserLocationPgTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<UserAccountRoleTable>('UserAccountRoleTable').to(MemoziedUserAccountRoleTable);
  bind<UserLocationRoleTable>('UserLocationRoleTable').to(MemoizedUserLocationRoleTable);
  bind<UserDetailTable>('UserDetailTable').to(CachedUserDetailTable);
  bind<UserTable>('UserTable').to(CachedUserTable);
  bind<UserResolver>('UserResolver').to(UserResolver);
  bind<UserService>('UserService').to(UserService);
  bind<string>('DefaultUserLocale').toConstantValue(config.defaultUserLocale);
  bind<UserInviteService>('UserInviteService').to(UserInviteService);
  bind<UserRegistrationTokenMetadataTable>('UserRegistrationTokenMetadataTable').to(UserRegistrationTokenMetadataTable);
  bind<string>('RegistrationTokenSecret').toConstantValue(config.registrationTokenSecret);
  bind<UserLocationPgTable>('UserLocationPgTable').to(UserLocationPgTable);
});