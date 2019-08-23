import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { FloDetectEventChronologyRecordData } from './FloDetectEventChronologyRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { FloDetectStatus } from '../api';
import * as Option from 'fp-ts/lib/Option';

@injectable()
class FloDetectEventChronologyTable extends DatabaseTable<FloDetectEventChronologyRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'FloDetectEventChronology');
  }

  public composeKeys(macAddress: string, computationId: string, startDate: string): { device_id_request_id: string, start: string } {
    return {
      device_id_request_id: `${ macAddress }_${ computationId }`,
      start: startDate
    };
  }

  public async retrieveAfterStartDate(macAddress: string, computationId: string, startDate: string, pageSize: number = 50, isDescending: boolean = false): Promise<FloDetectEventChronologyRecordData[]> {
    const deviceIdRequestId = `${ macAddress }_${ computationId }`;
    const compare = isDescending ? '<' : '>';

    return this.query<DynamoDbQuery>({
      KeyConditionExpression: `#device_id_request_id = :device_id_request_id AND #start ${ compare } :start`,
      ExpressionAttributeNames: {
        '#device_id_request_id': 'device_id_request_id',
        '#start': 'start'
      },
      ExpressionAttributeValues: {
        ':device_id_request_id': deviceIdRequestId,
        ':start': startDate
      },
      Limit: pageSize,
      ScanIndexForward: !isDescending
    });
  }
}

export default FloDetectEventChronologyTable;