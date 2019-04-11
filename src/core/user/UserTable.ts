import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import Config from '../../config/config';
import UserRecord from './UserRecord';

@injectable()
class UserTable extends DatabaseTable<UserRecord> {
  constructor(
    @inject('DatabaseClient') dbClient: DatabaseClient,
    @inject('Config') config: typeof Config
  ) {
    super(dbClient, config.dynamoTablePrefix + 'User');
  }
}

export default UserTable;