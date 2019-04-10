import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import IDeviceDynamoDBRecord from './IDeviceDynamoDBRecord';
import Config from '../config';

@injectable()
class DeviceDynamoDBTable extends DynamoDBTable<IDeviceDynamoDBRecord, string> {
  constructor(
    @inject('DynamoDBTable') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'ICD', 'id');
  }
}

export default DeviceDynamoDBTable;