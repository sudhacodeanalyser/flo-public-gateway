import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import UserDynamoDBRecord from './UserDynamoDBRecord';
import Config from '../config';

@injectable()
class UserDynamoDBTable extends DynamoDBTable<UserDynamoDBRecord, string> {
  constructor(
    @inject('DynamoDBTable') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'User', 'id');
  }
}

export default UserDynamoDBTable;