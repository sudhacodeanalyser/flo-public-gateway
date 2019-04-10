import _ from 'lodash';
import { unmanaged, injectable } from 'inversify';
import AWS from 'aws-sdk';

type UpdateMap = { [key: string]: any };
type KeyMap<THashKey, TRangeKey> = { [key: string]: THashKey | TRangeKey }

@injectable()
class DynamoDBTable<TRecord, THashKey, TRangeKey = {}> {

  constructor(
    @unmanaged() private dynamoDBClient: AWS.DynamoDB.DocumentClient,
    @unmanaged() private prefix: string,
    @unmanaged() private tableName: string,
    @unmanaged() private hashKey: string,
    @unmanaged() private rangeKey?: string
  ) {}

  public async put(record: TRecord) {
    const marshaledData = await this.marshal(record);

    return this._put(marshaledData);
  }

  public async get(hashKeyValue: THashKey, rangeKeyValue?: TRangeKey) {
    const result = await this._get(hashKeyValue, rangeKeyValue);

    return this.unmarshal(result);
  }

  public async query(options: AWS.DynamoDB.DocumentClient.QueryInput) {
    const result = await this._query(options);

    return this.unmarshalQuery(result);
  }

  public async update(keys: KeyMap<THashKey, TRangeKey>, data: UpdateMap) {
    const {
      UpdateExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames
    } = this.createUpdate(data);

    return this.dynamoDBClient.update({
      TableName: this.getTableName(),
      Key: keys,
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    })
    .promise();
  }

  protected getTableName() {
    return `${ this.prefix }${ this.tableName }`;
  }

  protected marshal(record: TRecord) {
    return Promise.resolve(record);
  }

  protected unmarshal(result: AWS.DynamoDB.DocumentClient.ItemResponse) {
    return Promise.resolve(result);
  }

  protected unmarshalQuery(result: AWS.DynamoDB.DocumentClient.QueryOutput) {
    return Promise.resolve(result);
  }

  protected async _get(hashKeyValue: THashKey, rangeKeyValue?: TRangeKey) {
    const keys = {
      [this.hashKey]: hashKeyValue,
      ...(
        !this.rangeKey ? 
          {} :
          { 
            [this.rangeKey]: rangeKeyValue
          }
      )
    };

    return this.dynamoDBClient.get({
      TableName: this.getTableName(),
      Key: keys
    })
    .promise();
  }

  protected async _put(record: any) {
    return this.dynamoDBClient.put({
      TableName: this.getTableName(),
      Item: record
    })
    .promise();
  }

  protected async _query(options: AWS.DynamoDB.DocumentClient.QueryInput) {
    return this.dynamoDBClient.query(options)
    .promise();
  }


  private createUpdate(data: UpdateMap) {
    const elements = _.map(data, (value, key) => ({
      key,
      exprName: `#${ key }`,
      value,
      exprValue: `:${ key }`
    }));
    const setOps = elements
      .map(({ exprName, exprValue }) => `${ exprName } = ${ exprValue }`);
    const UpdateExpression = `SET ${ setOps.join(', ') }`;
    const ExpressionAttributeNames = elements
      .reduce((acc, { exprName, key }) => ({ 
        ...acc,
        [exprName]: key 
      }), {});
    const ExpressionAttributeValues = elements
      .reduce((acc, { exprValue, value }) => ({
        ...acc,
        [exprValue]: value
      }), {});

    return {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    };
  }
}

export default DynamoDBTable;