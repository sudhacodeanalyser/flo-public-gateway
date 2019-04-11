import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBTable from '../../dynamo/DynamoDBTable';
import AccountRecord from './AccountRecord';
import Config from '../../config/config';

@injectable()
class AccountDynamoDBTable extends DynamoDBTable<AccountRecord, string> {
  constructor(
    @inject('DynamoDBClient') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'Account', 'id');
  }
}

export default AccountDynamoDBTable;