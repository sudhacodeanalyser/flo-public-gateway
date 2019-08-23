import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { FloDetectResultRecordData } from './FloDetectResultRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { FloDetectStatus } from '../api';
import * as Option from 'fp-ts/lib/Option';

@injectable()
class FloDetectResultTable extends DatabaseTable<FloDetectResultRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'FloDetectResult');
  }

  public async retrieveLatestByMacAddress(macAddress: string, durationInSeconds: number): Promise<Option.Option<FloDetectResultRecordData>> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'DeviceIdStatusDurationInSecondsStartDate',
      KeyConditionExpression: '#device_id = :device_id AND begins_with(#status_duration, :status_duration)',
      ExpressionAttributeNames: {
        '#device_id': 'device_id',
        '#status_duration': 'status_duration_in_seconds_start_date' 
      },
      ExpressionAttributeValues: {
        ':device_id': macAddress,
        ':status_duration': `${ FloDetectStatus.EXECUTED }_${ durationInSeconds }_`
      },
      ScanIndexForward: false,
      Limit: 1
    });

    return Option.fromNullable(result[0]);
  }

  public async getByComputationId(computationId: string): Promise<Option.Option<FloDetectResultRecordData>> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'RequestIdIndex',
      KeyConditionExpression: '#request_id = :request_id',
      ExpressionAttributeNames: {
        '#request_id': 'request_id'
      },
      ExpressionAttributeValues: {
        ':request_id': computationId
      }
    });

    return Option.fromNullable(result[0]);
  }
}

export default FloDetectResultTable;