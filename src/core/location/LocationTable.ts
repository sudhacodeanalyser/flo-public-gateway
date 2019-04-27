import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { LocationRecordData } from './LocationRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

@injectable()
class LocationTable extends DatabaseTable<LocationRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'Location');
  }

  public async getByLocationId(locationId: string): Promise<LocationRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'LocationIdIndex',
      KeyConditionExpression: '#location_id = :location_id',
      ExpressionAttributeNames: {
        '#location_id': 'location_id'
      },
      ExpressionAttributeValues: {
        ':location_id': locationId
      }
    });

    return result.length ? result[0] : null;
  }

  public async getAllByAccountId(accountId: string): Promise<LocationRecordData[]> {
    return this.query<DynamoDbQuery>({
      KeyConditionExpression: '#account_id = :account_id',
      ExpressionAttributeNames: {
        '#account_id': 'account_id'
      },
      ExpressionAttributeValues: {
        ':account_id': accountId
      }
    });
  }
}

export default LocationTable;