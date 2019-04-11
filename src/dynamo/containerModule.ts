import { ContainerModule, interfaces } from 'inversify';
import AWS from 'aws-sdk';
import DatabaseClient from '../database/DatabaseClient';
import DynamoDbClient from './DynamoDbClient';

export default new ContainerModule((bind: interfaces.Bind) => {
  const dynamoDBClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

  bind<AWS.DynamoDB.DocumentClient>('DynamoDBClient').toConstantValue(dynamoDBClient);
  bind<DatabaseClient>('DatabaseClient').to(DynamoDbClient);
});