import { ContainerModule, interfaces } from 'inversify';
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import * as AWS_DynamoDB from "@aws-sdk/client-dynamodb";

const {
  DynamoDB
} = AWS_DynamoDB;

import DatabaseClient from '../DatabaseClient';
import DynamoDbClient from './DynamoDbClient';
import config from '../../config/config';
import { HttpsAgent } from 'agentkeepalive';

export default new ContainerModule((bind: interfaces.Bind) => {
  let dynamoDbDocClient: AWS_DynamoDB.DocumentClient | null = null;

  bind<string>('TablePrefix').toConstantValue(config.dynamoTablePrefix);
  bind<AWS.DynamoDB.DocumentClient>('DynamoDbDocumentClient').toDynamicValue((context: interfaces.Context) => {

    if (dynamoDbDocClient) {
      return dynamoDbDocClient;
    }
    
    // // tslint:disable
    // console.log({
    //   AWS_REGION: process.env.AWS_REGION,
    //   AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
    //   AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    //   AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    // });
    
    // dynamoDbDocClient = new AWS.DynamoDB.DocumentClient({
    //   httpOptions: {
    //     timeout: config.dynamoDBTimeoutMS
    //   }
    // });
    
    const httpsAgent = context.container.get<HttpsAgent>('HttpsAgent');
    dynamoDbDocClient = DynamoDBDocument.from(new DynamoDB({
      region: 'us-west-2',
      httpOptions: {
        agent: httpsAgent,
        timeout: config.dynamoDBTimeoutMS
      }
    }));

    return dynamoDbDocClient;
  })
  bind<DatabaseClient>('DatabaseClient').to(DynamoDbClient);
  bind<DynamoDbClient>('DynamoDbClient').to(DynamoDbClient);
});