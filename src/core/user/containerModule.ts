import { ContainerModule, interfaces } from 'inversify';
import UserLocationRoleTable from './UserLocationRoleTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<UserLocationRoleTable>('UserLocationRoleTable').to(UserLocationRoleTable);
});