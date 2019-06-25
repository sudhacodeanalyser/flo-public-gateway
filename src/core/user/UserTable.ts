import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { UserRecordData } from './UserRecord';

@injectable()
class UserTable extends DatabaseTable<UserRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'User');
  }
}

export default UserTable;