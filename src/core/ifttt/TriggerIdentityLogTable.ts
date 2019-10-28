import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { TriggerIdentityLogRecordData } from './TriggerIdentityLogRecord';

@injectable()
class TriggerIdentityLogTable extends DatabaseTable<TriggerIdentityLogRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'IFTTTTriggerIdentityLog');
  }
}

export default TriggerIdentityLogTable;
