import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { AccountRecordData } from './AccountRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

@injectable()
class AccountTable extends DatabaseTable<AccountRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'Account');
  }

  public async getByOwnerUserId(ownerUserId: string): Promise<AccountRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'OwnerUser',
      KeyConditionExpression: '#owner_user_id = :owner_user_id',
      ExpressionAttributeNames: {
        '#owner_user_id': 'owner_user_id'
      },
      ExpressionAttributeValues: {
        ':owner_user_id': ownerUserId
      }
    });

    return result.length ? result[0] : null;
  }
}

export default AccountTable;
