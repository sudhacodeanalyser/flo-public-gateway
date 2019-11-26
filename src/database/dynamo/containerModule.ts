import { ContainerModule, interfaces } from 'inversify';
import AWS from 'aws-sdk';
import DatabaseClient from '../DatabaseClient';
import DynamoDbClient from './DynamoDbClient';
import config from '../../config/config';
import { HttpsAgent } from 'agentkeepalive';

export default new ContainerModule((bind: interfaces.Bind) => {
  let dynamoDbDocClient: AWS.DynamoDB.DocumentClient | null = null;

  bind<string>('TablePrefix').toConstantValue(config.dynamoTablePrefix);
  bind<AWS.DynamoDB.DocumentClient>('DynamoDbDocumentClient').toDynamicValue((context: interfaces.Context) => {

    if (dynamoDbDocClient) {
      return dynamoDbDocClient;
    }

    const httpsAgent = context.container.get<HttpsAgent>('HttpsAgent');

    dynamoDbDocClient = new AWS.DynamoDB.DocumentClient({
      region: 'us-west-2',
      httpOptions: {
        agent: httpsAgent
      }
    });

    return dynamoDbDocClient;
  })
  bind<DatabaseClient>('DatabaseClient').to(DynamoDbClient);
  bind<DynamoDbClient>('DynamoDbClient').to(DynamoDbClient);
});