import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import Config from '../../config/config';
import LocationRecord from './LocationRecord';

@injectable()
class LocationTable extends DatabaseTable<LocationRecord> {
  constructor(
    @inject('DatabaseClient') dbClient: DatabaseClient,
    @inject('Config') config: typeof Config
  ) {
    super(dbClient, config.dynamoTablePrefix + 'Location');
  }
}

export default LocationTable;