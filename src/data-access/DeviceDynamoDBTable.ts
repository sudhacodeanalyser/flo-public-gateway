import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import DeviceDynamoDBRecord from './DeviceDynamoDBRecord';
import Config from '../config';

@injectable()
class DeviceDynamoDBTable extends DynamoDBTable<DeviceDynamoDBRecord, string> {
  constructor(
    @inject('DynamoDBTable') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'ICD', 'id');
  }
}

export default DeviceDynamoDBTable;