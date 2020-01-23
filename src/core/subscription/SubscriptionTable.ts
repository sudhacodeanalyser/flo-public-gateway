import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import DynamoDbClient, { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import { SubscriptionRecordData } from './SubscriptionRecord';

@injectable()
class SubscriptionTable extends DatabaseTable<SubscriptionRecordData> {
  constructor(@inject('DatabaseClient') public dbClient: DynamoDbClient) {
    super(dbClient, 'Subscription');
  }

  public async scan(limit?: number, nextIterator?: any): Promise<{ items: SubscriptionRecordData[], nextIterator?: any }> {
    const { items, lastEvaluatedKey } = await this.dbClient.scan<SubscriptionRecordData>(this.tableName, limit, nextIterator);

    return {
      items,
      nextIterator: lastEvaluatedKey
    };
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

  public async getByProviderCustomerId(customerId: string): Promise<SubscriptionRecordData[]> {
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

    return result;
  }
}

export default SubscriptionTable;