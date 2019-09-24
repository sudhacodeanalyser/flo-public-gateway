import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { OldSubscriptionRecordData } from './OldSubscriptionRecord';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';

// TODO: Remove me once data migration is completed.
@injectable()
class OldSubscriptionTable extends DatabaseTable<OldSubscriptionRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'AccountSubscription');
  }

  public async getByLocationId(locationId: string): Promise<OldSubscriptionRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'LocationIdIndex',
      KeyConditionExpression: '#location_id = :location_id',
      ExpressionAttributeNames: {
        '#location_id': 'location_id'
      },
      ExpressionAttributeValues: {
        ':location_id': locationId
      }
    });

    return result.length ? result[0] : null;
  }

  public async getByCustomerId(customerId: string): Promise<OldSubscriptionRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'StripeCustomerIdIndex',
      KeyConditionExpression: '#stripe_customer_id = :stripe_customer_id',
      ExpressionAttributeNames: {
        '#stripe_customer_id': 'stripe_customer_id'
      },
      ExpressionAttributeValues: {
        ':stripe_customer_id': customerId
      }
    });

    return result.length ? result[0] : null;
  }
}

export default OldSubscriptionTable;