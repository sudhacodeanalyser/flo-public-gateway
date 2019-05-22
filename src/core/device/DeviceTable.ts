import _ from 'lodash';
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

  public async getAllByLocationId(locationId: string): Promise<DeviceRecordData[]> {
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

  public async getByMacAddress(macAddress: string): Promise<DeviceRecordData | null> {
    const devices = await this.query<DynamoDbQuery>({
      IndexName: 'DeviceIdIndex',
      KeyConditionExpression: '#device_id = :device_id',
      ExpressionAttributeNames: {
        '#device_id': 'device_id'
      },
      ExpressionAttributeValues: {
        ':device_id': macAddress
      }
    });

    return _.isEmpty(devices) ? null : devices[0];
  }
}

export default DeviceTable;