import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { SubscriptionRecordData } from './SubscriptionRecord';

@injectable()
class SubscriptionTable extends DatabaseTable<SubscriptionRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'Subscription');
  }

  public async getByRelatedEntityId(relatedEntityId: string): Promise<SubscriptionRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'RelatedEntityId',
      KeyConditionExpression: '#related_entity_id = :related_entity_id',
      ExpressionAttributeNames: {
        '#related_entity_id': 'related_entity_id'
      },
      ExpressionAttributeValues: {
        ':related_entity_id': relatedEntityId
      }
    });

    return result.length ? result[0] : null;
  }

  public async getByProviderCustomerId(customerId: string): Promise<SubscriptionRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'ProviderCustomerId',
      KeyConditionExpression: '#provider_customer_id = :provider_customer_id',
      ExpressionAttributeNames: {
        '#provider_customer_id': 'provider_customer_id'
      },
      ExpressionAttributeValues: {
        ':provider_customer_id': customerId
      }
    });

    return result.length ? result[0] : null;
  }
}

export default SubscriptionTable;