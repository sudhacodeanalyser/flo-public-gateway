import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../utils/DynamoDBTable';
import AccountDynamoDBRecord from './AccountDynamoDBRecord';
import Config from '../config';

@injectable()
class AccountDynamoDBTable extends DynamoDBTable<AccountDynamoDBRecord, string> {
  constructor(
    @inject('DynamoDBClient') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'Account', 'id');
  }
}

export default AccountDynamoDBTable;