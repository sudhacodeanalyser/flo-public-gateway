import { inject, injectable } from 'inversify';
import DynamoDbClient from '../../database/dynamo/DynamoDbClient';
import BatchedDatabaseTable from '../../database/BatchedDatabaseTable';
import { AlertFeedbackRecordData } from './AlertFeedbackRecord';
import { KeyMap } from '../../database/DatabaseClient'; 
import Dataloader from 'dataloader';
import * as _ from 'lodash';
import NotFoundError from '../api/error/NotFoundError';

@injectable()
class AlertFeedbackTable extends BatchedDatabaseTable<AlertFeedbackRecordData> {

  constructor(@inject('DatabaseClient') dbClient: DynamoDbClient) {
    super(dbClient, 'AlertFeedback');

    this.defaultBatchSize = 50;
  }
}

export default AlertFeedbackTable;