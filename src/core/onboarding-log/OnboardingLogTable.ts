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
      IndexName: 'EventIndex',
      KeyConditionExpression: 'icd_id = :icd_id',
  		ExpressionAttributeValues: {
  			':icd_id': icdId
  		},
	 	  ScanIndexForward: false,
	 	  Limit: 1
    });

    return _.isEmpty(onboardingLogs) ? null : onboardingLogs[0];
  }
}

export default OnboardingLogTable;