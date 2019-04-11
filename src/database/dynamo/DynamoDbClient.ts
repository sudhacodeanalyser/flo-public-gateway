import AWS from 'aws-sdk';
import DatabaseClient, { Patch, KeyMap } from '../DatabaseClient';
import { inject, injectable } from 'inversify';

@injectable()
class DynamoDbClient implements DatabaseClient {
  constructor(
   @inject('DynamoDbDocumentClient') public dynamoDb: AWS.DynamoDB.DocumentClient,
   @inject('TablePrefix') public tablePrefix: string
  ) {}

  public async put<T>(tableName: string, item: T): Promise<T> {
    const { Attributes } = await this._put(tableName, item);

    return Attributes as T;
  }

  public _put<T>(tableName: string, item: T) {
    return this.dynamoDb.put({
      TableName: this.tablePrefix + tableName,
      Item: item,
      ReturnValues: 'ALL_NEW'
    })
    .promise();
  }

  public _get<T>(tableName: string, key: KeyMap) {
    return this.dynamoDb.get({
      TableName: this.tablePrefix + tableName,
      Key: key
    })
    .promise();
  }

  public async get<T>(tableName: string, key: KeyMap) {
    const { Item } = await this._get(tableName, key);

    return Item as T;
  }

  public _update<T>(tableName: string, key: KeyMap, patch: Patch) {
    const {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    } = this.createUpdate(patch);

    return this.dynamoDb.update({
      TableName: this.tablePrefix + tableName,
      Key: key,
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEw'
    })
    .promise();
  }

  public async update<T>(tableName: string, key: KeyMap, patch: Patch): Promise<T> {
    const { Attributes } = await this._update(tableName, key, patch);

    return Attributes as T;
  }

  public _remove(tableName: string, key: KeyMap) {
    return this.dynamoDb.get({
      TableName: this.tablePrefix + tableName,
      Key: key
    })
    .promise();
  }

  public async remove(tableName: string, key: KeyMap): Promise<void> {
    await this._remove(tableName, key);
  }

  private createUpdate(patch: Patch) {
    // TODO
    return {
      UpdateExpression: '#foo = :foo',
      ExpressionAttributeNames: {
        '#foo': 'foo'
      },
      ExpressionAttributeValues: {
        ':foo': 'bar'
      }
    };
  }
}

export default DynamoDbClient;