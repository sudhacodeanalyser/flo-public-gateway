import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { AlertFeedbackFlowRecordData } from './AlertFeedbackFlowRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

@injectable()
class AlertFeedbackFlowTable extends DatabaseTable<AlertFeedbackFlowRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'AlertFeedbackFlow');
  }

  public async getByAlarmId(alarmId: number): Promise<AlertFeedbackFlowRecordData[]> {
    return this.query<DynamoDbQuery>({
      KeyConditionExpression: '#alarm_id = :alarm_id',
      ExpressionAttributeNames: {
        '#alarm_id': 'alarm_id'
      },
      ExpressionAttributeValues: {
        ':alarm_id': alarmId
      }
    });
  }
}

export default AlertFeedbackFlowTable;