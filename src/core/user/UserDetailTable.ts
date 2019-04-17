import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { UserDetailRecord } from './UserDetailRecord';

@injectable()
class UserDetailTable extends DatabaseTable<UserDetailRecord> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserDetail');
  }
}

export default UserDetailTable;