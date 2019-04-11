import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import LocationRecord from './LocationRecord';

@injectable()
class LocationTable extends DatabaseTable<LocationRecord> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'Location');
  }
}

export default LocationTable;