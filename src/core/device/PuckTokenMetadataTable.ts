import * as _ from 'lodash';
import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { PuckTokenMetadata } from './PuckTokenMetadata';

@injectable()
class PuckTokenMetadataTable extends DatabaseTable<PuckTokenMetadata> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'PuckTokenMetadata');
  }

  public async getAllByPuckId(puckId: string): Promise<PuckTokenMetadata[]> {
    return this.query<DynamoDbQuery>({
      IndexName: 'PuckIdIndex',
      KeyConditionExpression: '#puckId = :puckId',
      ExpressionAttributeNames: {
        '#puckId': 'puckId'
      },
      ExpressionAttributeValues: {
        ':puckId': puckId
      }
    });
  }
}

export default PuckTokenMetadataTable;