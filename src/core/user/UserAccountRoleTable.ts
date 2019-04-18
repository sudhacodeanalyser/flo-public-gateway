import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { UserAccountRoleRecordData } from './UserAccountRoleRecord';

@injectable()
class UserAccountRoleTable extends DatabaseTable<UserAccountRoleRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserAccountRole');
  }

  public async getByUserId(userId: string): Promise<UserAccountRoleRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      KeyConditionExpression: '#user_id = :user_id',
      ExpressionAttributeNames: {
        '#user_id': 'user_id'
      },
      ExpressionAttributeValues: {
        ':user_id': userId
      }
    });

    return result.length ? result[0] : null;
  }

  public async getAllByAccountId(accountId: string): Promise<UserAccountRoleRecordData[]> {
    return this.query<DynamoDbQuery>({
      IndexName: 'AccountIdIndex',
      KeyConditionExpression: '#account_id = :account_id',
      ExpressionAttributeNames: {
        '#account_id': 'account_id'
      },
      ExpressionAttributeValues: {
        ':account_id': accountId
      }
    });
  }

  public async getByAccountId(accountId: string): Promise<UserAccountRoleRecordData | null> {
    const result = await this.getAllByAccountId(accountId);

    return result.length ? result[0] : null;
  }
}

export default UserAccountRoleTable;