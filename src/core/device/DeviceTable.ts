import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import Config from '../../config/config';
import DeviceRecord from './DeviceRecord';

@injectable()
class DeviceTable extends DatabaseTable<DeviceRecord> {
  constructor(
    @inject('DatabaseClient') dbClient: DatabaseClient,
    @inject('Config') config: typeof Config
  ) {
    super(dbClient, config.dynamoTablePrefix + 'ICD');
  }
}

export default DeviceTable;