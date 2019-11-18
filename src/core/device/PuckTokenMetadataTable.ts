import _ from 'lodash';
import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

@injectable()
class PuckTokenMetadataTable extends DatabaseTable<any> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'PuckTokenMetadataTable');
  }
}

export default PuckTokenMetadataTable;