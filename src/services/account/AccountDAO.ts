import { inject, injectable } from 'inversify';
import AWS from 'aws-sdk';
import DynamoDBDAO from '../../utils/DynamoDBDAO';
import IAccountRecord from './IAccountRecord';
import Config from '../../config';

@injectable() 
class AccountDAO extends DynamoDBDAO<IAccountRecord, string> {
  constructor(
    @inject('DynamoDBClient') dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @inject('Config') private readonly config: typeof Config
  ) {
    super(dynamoDBClient, config.dynamoTablePrefix, 'Account', 'id');
  }
}

export default AccountDAO;