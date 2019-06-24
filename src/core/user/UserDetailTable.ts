import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { UserDetailRecordData } from './UserDetailRecord';

@injectable()
class UserDetailTable extends DatabaseTable<UserDetailRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserDetail');
  }
}

export default UserDetailTable;