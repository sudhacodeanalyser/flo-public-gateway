import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { AlertFeedbackRecordData } from './AlertFeedbackRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import * as Option from 'fp-ts/lib/Option';

@injectable()
class AlertFeedbackTable extends DatabaseTable<AlertFeedbackRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'AlertFeedback');
  }
}

export default AlertFeedbackTable;