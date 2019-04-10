import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import IAccountDynamoDBRecord from './IAccountDynamoDBRecord';
import Config from '../config';

@injectable() 
class AccountDynamoDBTable extends DynamoDBTable<IAccountDynamoDBRecord, string> {
  constructor(
    @inject('DynamoDBClient') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'Account', 'id');
  }
}

export default AccountDynamoDBTable;