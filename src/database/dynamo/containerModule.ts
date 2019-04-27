import { ContainerModule, interfaces } from 'inversify';
import AWS from 'aws-sdk';
import DatabaseClient from '../DatabaseClient';
import DynamoDbClient from './DynamoDbClient';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  const dynamoDbDocClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

  bind<string>('TablePrefix').toConstantValue(config.dynamoTablePrefix);
  bind<AWS.DynamoDB.DocumentClient>('DynamoDbDocumentClient').toConstantValue(dynamoDbDocClient);
  bind<DatabaseClient>('DatabaseClient').to(DynamoDbClient);
});