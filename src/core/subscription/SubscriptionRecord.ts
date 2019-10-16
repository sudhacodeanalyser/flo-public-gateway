import { Subscription, Timestamped } from '../api';

export interface StripeProviderData {
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  cancel_at_period_end?: boolean;
  status?: string;
}

export interface SubscriptionRecordData extends Timestamped {
  id: string;
  plan_id: string;
  related_entity: string;
  related_entity_id: string;
  source_id: string;
  is_active: boolean;
  subscription_provider: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  stripe_provider_data?: StripeProviderData;
  cancellation_reason?: string;
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
      provider_subscription_id: providerData && providerData.subscriptionId,
      cancellation_reason: subscription.cancellationReason,
      stripe_provider_data: provider && provider.name === 'stripe' && providerData ?
        {
          current_period_start: providerData.currentPeriodStart,
          current_period_end: providerData.currentPeriodEnd,
          cancel_at_period_end: providerData.cancelAtPeriodEnd,
          status: providerData.status,
          canceled_at: providerData.canceledAt
        } :
        undefined
    };
  }

  public static fromModel(subscription: Subscription): SubscriptionRecordData {
    const provider = subscription.provider;
    const providerData = provider && provider.data;

    return {
      id: subscription.id,
      plan_id: subscription.plan.id,
      related_entity: 'location', // TODO: No hardcoding.
      related_entity_id: subscription.location.id,
      is_active: subscription.provider.isActive,
      source_id: subscription.sourceId,
      subscription_provider: subscription.provider.name,
      provider_customer_id: subscription.provider.data.customerId,
      provider_subscription_id: subscription.provider.data.subscriptionId,
      cancellation_reason: subscription.cancellationReason,
      stripe_provider_data: provider && provider.name === 'stripe' && providerData ?
        {
          current_period_start: providerData.currentPeriodStart,
          current_period_end: providerData.currentPeriodEnd,
          cancel_at_period_end: providerData.cancelAtPeriodEnd,
          status: providerData.status,
          canceled_at: providerData.canceledAt
        } :
        undefined
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
          subscriptionId: this.data.provider_subscription_id,
          currentPeriodStart: this.data.stripe_provider_data && this.data.stripe_provider_data.current_period_start,
          currentPeriodEnd: this.data.stripe_provider_data && this.data.stripe_provider_data.current_period_end,
          canceledAt: this.data.stripe_provider_data && this.data.stripe_provider_data.canceled_at,
          cancelAtPeriodEnd: this.data.stripe_provider_data && this.data.stripe_provider_data.cancel_at_period_end,
          status: this.data.stripe_provider_data && this.data.stripe_provider_data.status
        }
      },
      createdAt: this.data.created_at,
      updatedAt: this.data.updated_at,
      cancellationReason: this.data.cancellation_reason
    }
  }
}