import * as _ from 'lodash';
import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

interface PairInitRecordData {
  account_id: string;
  mac_address: string;
  created_at: string;
  user_id?: string;
  _ttl: number;
}


@injectable()
class PairInitTable extends DatabaseTable<PairInitRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'PairInit');
  }

  public async getByMacAddress(macAddress: string): Promise<PairInitRecordData[]> {
    return this.query<DynamoDbQuery>({
      IndexName: 'MacAddressIndex',
      KeyConditionExpression: '#mac_address = :mac_address',
      ExpressionAttributeNames: {
        '#mac_address': 'mac_address'
      },
      ExpressionAttributeValues: {
        ':mac_address': macAddress
      }
    });
  }
}

export default PairInitTable;