import { inject, injectable } from 'inversify';
import DynamoDbClient from '../../database/dynamo/DynamoDbClient';
import DatabaseTable from '../../database/DatabaseTable';
import { AlertFeedbackRecordData } from './AlertFeedbackRecord';
import { KeyMap } from '../../database/DatabaseClient'; 
import Dataloader from 'dataloader';
import stringify from 'json-stable-stringify';
import _ from 'lodash';
import NotFoundError from '../api/error/NotFoundError';

@injectable()
class AlertFeedbackTable extends DatabaseTable<AlertFeedbackRecordData> {
  private dataloader: Dataloader<string, AlertFeedbackRecordData>;

  constructor(@inject('DatabaseClient') dbClient: DynamoDbClient) {
    super(dbClient, 'AlertFeedback');

    this.dataloader = new Dataloader<string, AlertFeedbackRecordData>(
      async keys => {
        const keyMaps = keys.map(key => JSON.parse(key));
        const result = await this.batchGet(keyMaps, 100);

        return result.map(item => item === null ? new NotFoundError() : item);
      }
    );
  }

  public async get(keys: KeyMap): Promise<AlertFeedbackRecordData | null> {
    try {
      const result = await this.dataloader.load(stringify(keys));

      if (result instanceof NotFoundError) {
        return null;
      }

      return result;
    } catch (err) {

      if (err instanceof NotFoundError) {
        return null;
      } else {
        throw err;
      }

    }
  }

}

export default AlertFeedbackTable;