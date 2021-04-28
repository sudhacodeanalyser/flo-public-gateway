import { inject, injectable } from 'inversify';
import DatabaseClient, { KeyMap } from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import moment from 'moment';
import { UserRegistrationTokenMetadataRecordData } from './UserRegistrationTokenMetadataRecord';

@injectable()
class UserRegistrationTokenMetadataTable extends DatabaseTable<UserRegistrationTokenMetadataRecordData> {

  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserRegistrationTokenMetadata');
  }

  public async put(record: UserRegistrationTokenMetadataRecordData): Promise<UserRegistrationTokenMetadataRecordData> {
    const registrationDataExpiresAtSecs = record.registration_data_expires_at ?
      moment(record.registration_data_expires_at).unix() :
      undefined;

    return super.put({
      ...record,
      created_at: new Date().toISOString(),
      _registration_data_expires_at_secs: registrationDataExpiresAtSecs
    });
  }

  public async getByEmail(email: string): Promise<UserRegistrationTokenMetadataRecordData | null> {
    const results = await this.query<DynamoDbQuery>({
      IndexName: 'EmailCreatedAtIndex',
      KeyConditionExpression: '#email = :email',
      ExpressionAttributeNames: {
        '#email': 'email'
      },
      ExpressionAttributeValues: {
        ':email': this.sanitizeEmail(email)
      },
      ScanIndexForward: false,
      Limit: 1
    });

    return results[0] || null;
  }

  public async getByAccountId(accountId: string): Promise<UserRegistrationTokenMetadataRecordData[]> {
    const results = await this.query<DynamoDbQuery>({
      IndexName: 'AccountCreatedIndex',
      KeyConditionExpression: '#account_id = :account_id',
      ExpressionAttributeNames: {
        '#account_id': 'account_id'
      },
      ExpressionAttributeValues: {
        ':account_id': accountId
      },
      ScanIndexForward: false,
    });

    return results;
  }

  public async getAllUserRegistrationToken(pageSize: number = 20, startKey?: KeyMap): Promise<{ items: UserRegistrationTokenMetadataRecordData[], lastEvaluatedKey?: KeyMap }> {
    const results = await super.scan(pageSize, startKey);
    return results;
  }

  private sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}

export default UserRegistrationTokenMetadataTable;
