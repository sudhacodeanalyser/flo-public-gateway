import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import UserRecord from './UserRecord';

@injectable()
class UserTable extends DatabaseTable<UserRecord> {
  constructor(
    @inject('DatabaseClient') dbClient: DatabaseClient,
    @inject('TablePrefix') tablePrefix: string
  ) {
    super(dbClient, tablePrefix + 'User');
  }
}

export default UserTable;