import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../../dynamo/DynamoDBTable';
import DeviceRecord from './DeviceRecord';
import Config from '../../config/config';

@injectable()
class DeviceDynamoDBTable extends DynamoDBTable<DeviceRecord, string> {
  constructor(
    @inject('DynamoDBTable') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'ICD', 'id');
  }
}

export default DeviceDynamoDBTable;