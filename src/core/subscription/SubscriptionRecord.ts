import { Subscription, Timestamped, SubscriptionProvider } from "../api/api";

export interface SubscriptionRecordData extends Timestamped {
  id: string,
  plan_id: string
  related_entity: string
  related_entity_id: string
  source_id: string
  subscription_provider: string
  provider_customer_id: string
  provider_subscription_id: string
}

export class SubscriptionRecord {
  public static fromModel(subscription: Subscription, provider: SubscriptionProvider): SubscriptionRecordData {
    return {
      id: subscription.id,
      plan_id: subscription.plan.id,
      related_entity: 'location', // TODO: No hardcoding.
      related_entity_id: subscription.location.id,
      source_id: subscription.sourceId,
      subscription_provider: provider.name,
      provider_customer_id: provider.customerId,
      provider_subscription_id: provider.subscriptionId
    };
  }

  constructor(
    public data: SubscriptionRecordData
  ) {}

  public toModel(): Subscription {
    return {
      id: this.data.id,
      plan: {
        id: this.data.plan_id
      },
      location: {
        id: this.data.related_entity_id
      },
      sourceId: this.data.source_id,
      createdAt: this.data.created_at,
      updatedAt: this.data.updated_at
    }
  }
}