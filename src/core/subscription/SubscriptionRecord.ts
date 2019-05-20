import { Subscription, Timestamped } from '../api';

export interface SubscriptionRecordData extends Timestamped {
  id: string,
  plan_id: string
  related_entity: string
  related_entity_id: string
  source_id: string
  is_active: boolean,
  subscription_provider: string
  provider_customer_id: string
  provider_subscription_id: string
}

export class SubscriptionRecord {
  public static fromPartialModel(subscription: Partial<Subscription>): Partial<SubscriptionRecordData> {
    const provider = subscription.provider;
    const providerData = provider && provider.data;
    return {
      id: subscription.id,
      plan_id: subscription.plan && subscription.plan.id,
      related_entity: 'location',
      related_entity_id: subscription.location && subscription.location.id,
      is_active: provider && provider.isActive,
      source_id: subscription.sourceId,
      subscription_provider: provider && provider.name,
      provider_customer_id: providerData && providerData.customerId,
      provider_subscription_id: providerData && providerData.subscriptionId
    };
  }

  public static fromModel(subscription: Subscription): SubscriptionRecordData {
    return {
      id: subscription.id,
      plan_id: subscription.plan.id,
      related_entity: 'location', // TODO: No hardcoding.
      related_entity_id: subscription.location.id,
      is_active: subscription.provider.isActive,
      source_id: subscription.sourceId,
      subscription_provider: subscription.provider.name,
      provider_customer_id: subscription.provider.data.customerId,
      provider_subscription_id: subscription.provider.data.subscriptionId
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
      provider: {
        name: this.data.subscription_provider,
        isActive: this.data.is_active,
        data: {
          customerId: this.data.provider_customer_id,
          subscriptionId: this.data.provider_subscription_id
        }
      },
      createdAt: this.data.created_at,
      updatedAt: this.data.updated_at
    }
  }
}