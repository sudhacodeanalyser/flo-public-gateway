import { unmanaged, injectable } from 'inversify';
import AWS from 'aws-sdk';

@injectable()
class DynamoDBDAO<TRecord, THashKey, TRangeKey = {}> {

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

  private getTableName() {
    return `${ this.prefix }${ this.tableName }`;
  }

  private marshal(record: TRecord) {
    return Promise.resolve(record);
  }

  private unmarshal(result: AWS.DynamoDB.ItemResponse) {
    return Promise.resolve(result);
  }

  private async _get(hashKeyValue: THashKey, rangeKeyValue?: TRangeKey) {
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

  private async _put(record: any) {
    return this.dynamoDBClient.put({
      TableName: this.getTableName(),
      Item: record
    })
    .promise();
  }
}

export default DynamoDBDAO;