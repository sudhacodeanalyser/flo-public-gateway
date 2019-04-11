import { ContainerModule, interfaces } from 'inversify';
import AWS from 'aws-sdk';
import DatabaseClient from '../database/DatabaseClient';
import DynamoDbClient from './DynamoDbClient';

export default new ContainerModule((bind: interfaces.Bind) => {
  const dynamoDBDocClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

  bind<AWS.DynamoDB.DocumentClient>('DynamoDBDocumentClient').toConstantValue(dynamoDBDocClient);
  bind<DatabaseClient>('DatabaseClient').to(DynamoDbClient);
});