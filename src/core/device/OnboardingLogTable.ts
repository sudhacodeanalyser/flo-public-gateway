import { inject, injectable } from 'inversify';
import _ from 'lodash';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { OnboardingLogRecord } from './OnboardingLogRecord';

@injectable()
class OnboardingLogTable extends DatabaseTable<OnboardingLogRecord> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'OnboardingLog');
  }

  public async getCurrentState(icdId: string): Promise<OnboardingLogRecord | null> {
    const onboardingLogs = await this.query<DynamoDbQuery>({
      KeyConditionExpression: '#icd_id = :icd_id',
      FilterExpression: '#event >= :installed',
      ExpressionAttributeNames: {
        '#icd_id': 'icd_id',
        '#event': 'event'
      },
      ExpressionAttributeValues: {
        ':icd_id': icdId,
        ':installed': 2
      }
    });

    return _.first(onboardingLogs) || null;
  }
}

export default OnboardingLogTable;