import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import DeviceRecord from './DeviceRecord';

@injectable()
class DeviceTable extends DatabaseTable<DeviceRecord> {
  constructor(
    @inject('DatabaseClient') dbClient: DatabaseClient,
    @inject('TablePrefix') tablePrefix: string
  ) {
    super(dbClient, tablePrefix + 'ICD');
  }
}

export default DeviceTable;