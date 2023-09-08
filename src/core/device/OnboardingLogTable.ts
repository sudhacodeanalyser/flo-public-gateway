import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import DynamoDbClient, { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import DatabaseTable from '../../database/DatabaseTable';
import { OnboardingLogRecord } from './OnboardingLogRecord';
import * as Option from 'fp-ts/lib/Option';
import * as AWS from 'aws-sdk';

@injectable()
class OnboardingLogTable extends DatabaseTable<OnboardingLogRecord> {
  constructor(@inject('DynamoDbClient') private dynamoClient: DynamoDbClient) {
    super(dynamoClient, 'OnboardingLog');
  }

  public async getCurrentState(icdId: string): Promise<OnboardingLogRecord | null> {
    const onboardingLogs = await this.query<DynamoDbQuery>({
      IndexName: 'EventIndex',
      KeyConditionExpression: '#icd_id = :icd_id AND #event >= :installed',
      ExpressionAttributeNames: {
        '#icd_id': 'icd_id',
        '#event': 'event'
      },
      ExpressionAttributeValues: {
        ':icd_id': icdId,
        ':installed': 2
      },
      Limit: 1
    });

    return _.first(onboardingLogs) || null;
  }



  public async getInstallEvent(icdId: string): Promise<Option.Option<OnboardingLogRecord>> {
    const onboardingLogs = await this.getFullLog(icdId);
    const installEvent = _.chain(onboardingLogs)
      .filter(({ event }) => event >= 2)
      .minBy('created_at')
      .value();

    return Option.fromNullable(installEvent);
  }

  public async getOutOfForcedSleepEvent(icdId: string): Promise<Option.Option<OnboardingLogRecord>> {
    const onboardingLogs = await this.getFullLog(icdId);
    // Get the latest event 3, if there is none, get the oldest event > 3
    const outOfForcedSleepEvent = 
      _.chain(onboardingLogs)
        .filter(({ event }) => event === 3)
        .maxBy('created_at')
        .value() ||
      _.chain(onboardingLogs)
        .filter(({ event }) => event > 3)
        .minBy('created_at')
        .value();


    return Option.fromNullable(outOfForcedSleepEvent);
  }

  public async getFullLog(icdId: string): Promise<OnboardingLogRecord[]> {
    return this.pageThruFullLog(icdId);
  }

  private async pageThruFullLog(icdId: string, ExclusiveStartKey?: AWS.DynamoDB.DocumentClient.Key): Promise<OnboardingLogRecord[]> {
    const { Items = [], LastEvaluatedKey } = await this.dynamoClient._query(this.tableName, {
      KeyConditionExpression: '#icd_id = :icd_id',
      ExpressionAttributeNames: {
        '#icd_id': 'icd_id'
      },
      ExpressionAttributeValues: {
        ':icd_id': icdId
      },
      ExclusiveStartKey
    })
    .promise();

    if (LastEvaluatedKey) {
      return [...Items as OnboardingLogRecord[], ...(await this.pageThruFullLog(icdId, LastEvaluatedKey))];
    }

    return Items as OnboardingLogRecord[];
  }
}

export default OnboardingLogTable;