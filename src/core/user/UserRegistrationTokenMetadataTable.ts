import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import moment from 'moment';

export interface UserRegistrationTokenMetadataRecord {
  token_id: string;
  email: string;
  created_at?: string;
  token_expires_at?: string;
  _registration_data_expires_at_secs?: number;
  registration_data_expires_at?: string;
  registration_data: any;
}

@injectable()
class UserRegistrationTokenMetadataTable extends DatabaseTable<UserRegistrationTokenMetadataRecord> {

  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserRegistrationTokenMetadata');
  }

  public async put(record: UserRegistrationTokenMetadataRecord): Promise<UserRegistrationTokenMetadataRecord> {
    const registrationDataExpiresAtSecs = record.registration_data_expires_at ?
      moment(record.registration_data_expires_at).unix() :
      undefined;

    return super.put({
      ...record,
      created_at: new Date().toISOString(),
      _registration_data_expires_at_secs: registrationDataExpiresAtSecs
    });
  }

  public async getByEmail(email: string): Promise<UserRegistrationTokenMetadataRecord | null> {
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

  private sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}

export default UserRegistrationTokenMetadataTable;