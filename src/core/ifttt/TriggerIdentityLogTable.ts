import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { TriggerIdentityLogRecordData } from './TriggerIdentityLogRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

@injectable()
class TriggerIdentityLogTable extends DatabaseTable<TriggerIdentityLogRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'IFTTTTriggerIdentityLog');
  }

  public async getByUserIdAndTriggerId(userId: string, triggerId: number): Promise<TriggerIdentityLogRecordData[]> {
    return this.query<DynamoDbQuery>({
      IndexName: 'UserIdFloTriggerIdTriggerIdentityIndex',
      KeyConditionExpression: 'user_id = :user_id AND begins_with(#range_key, :flo_trigger_id)',
      ExpressionAttributeNames: {
        '#range_key': 'flo_trigger_id_trigger_identity'
      },
      ExpressionAttributeValues: {
        ':user_id': userId,
        ':flo_trigger_id': `${triggerId}`
      }
    });
  }
}

export default TriggerIdentityLogTable;
