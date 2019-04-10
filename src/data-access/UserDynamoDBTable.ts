import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import IUserDynamoDBRecord from './IUserDynamoDBRecord';
import Config from '../config';

@injectable()
class UserDynamoDBTable extends DynamoDBTable<IUserDynamoDBRecord, string> {
  constructor(
    @inject('DynamoDBTable') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'User', 'id');
  }
}

export default UserDynamoDBTable;