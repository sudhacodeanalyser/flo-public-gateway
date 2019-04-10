import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import LocationDynamoDBRecord from './LocationDynamoDBRecord';
import Config from '../config';

@injectable()
class LocationDynamoDBTable extends DynamoDBTable<LocationDynamoDBRecord, string, string> {
  constructor(
    @inject('DynamoDBTable') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'Location', 'account_id', 'location_id');
  }

  public retrieveByLocationId(locationId: string) {
    return this.query({
      TableName: this.getTableName(),
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

export default LocationDynamoDBTable;