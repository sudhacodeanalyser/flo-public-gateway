import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { UserSystemRoleRecord } from './UserSystemRoleRecord';

@injectable()
class UserSystemRoleTable extends DatabaseTable<UserSystemRoleRecord> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserSystemRole');
  }
}

export default UserSystemRoleTable;