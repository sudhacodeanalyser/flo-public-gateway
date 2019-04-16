import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { DeviceRecordData } from './DeviceRecord';

@injectable()
class DeviceTable extends DatabaseTable<DeviceRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'ICD');
  }

  public getAllByLocationId(locationId: string): Promise<DeviceRecordData[]> {
    return this.query<DynamoDbQuery>({
      IndexName: 'LocationIdIndex',
      KeyConditionExpression: '#location_id = :location_id',
      ExpressionAttributeNames: {
        '#location_id': 'location_id'
      },
      ExpressionAttributeValues: {
        ':location_id': locationId
      }
    });
  } 
}

export default DeviceTable;