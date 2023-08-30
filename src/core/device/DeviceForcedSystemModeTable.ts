import * as _ from 'lodash';
import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { DeviceForcedSystemModeRecord } from './DeviceForcedSystemModeRecord';

@injectable()
class DeviceForcedSystemModeTable extends DatabaseTable<DeviceForcedSystemModeRecord> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'ICDForcedSystemMode');
  }

  public async getLatest(id: string): Promise<DeviceForcedSystemModeRecord | null> {
    const results = await this.query<DynamoDbQuery>({
      KeyConditionExpression: 'icd_id = :icd_id',
      ExpressionAttributeValues: {
        ':icd_id': id
      },
      ScanIndexForward: false,
      Limit: 1
    });

    return results[0] || null;
  }
}

export default DeviceForcedSystemModeTable;