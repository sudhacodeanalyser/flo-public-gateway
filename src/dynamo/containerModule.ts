import { ContainerModule, interfaces } from 'inversify';
import AWS from 'aws-sdk';

export default new ContainerModule((bind: interfaces.Bind) => {
  const dynamoDBClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

  bind<AWS.DynamoDB.DocumentClient>('DynamoDBClient').toConstantValue(dynamoDBClient);
});