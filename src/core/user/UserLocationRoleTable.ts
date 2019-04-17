import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { UserLocationRoleRecordData } from './UserLocationRoleRecord';

@injectable()
class UserLocationRoleTable extends DatabaseTable<UserLocationRoleRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'UserLocationRole');
  }

  public async getAllByUserId(userId: string): Promise<UserLocationRoleRecordData[]> {
    return this.query<DynamoDbQuery>({
      KeyConditionExpression: '#user_id = :user_id',
      ExpressionAttributeNames: {
        '#user_id': 'user_id'
      },
      ExpressionAttributeValues: {
        ':user_id': userId
      }
    });
  }

  public async getAllByLocationId(locationId: string): Promise<UserLocationRoleRecordData[]> {
    return this.query<DynamoDbQuery>({
      IndexName: 'LocationIdIndex',
      KeyConditionExpression: '#location_id = :location_id',
      ExpressionAttributeNames: {
        '#location_id': 'location_id'
      },
      ExpressionAttributeValues: {
        ':location_id': locationId
      }
    });
  }
}

export default UserLocationRoleTable;