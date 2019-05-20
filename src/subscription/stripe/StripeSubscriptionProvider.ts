import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionData, SubscriptionProvider, SubscriptionProviderInfo, User } from '../../core/api';
import { isSubscriptionActive } from './StripeUtils';

@injectable()
class StripeSubscriptionProvider implements SubscriptionProvider {
  public name: string = 'stripe';

  constructor(
    @inject('StripeClient') private stripeClient: Stripe
  ) {}

  public async createSubscription(user: User, subscription: SubscriptionData): Promise<SubscriptionProviderInfo> {
    const customer = await this.ensureStripeCustomer(user, subscription);
    const stripeSubscription = await this.doCreateSubscription(customer, subscription);

    return this.toProviderInfo(customer, stripeSubscription);
  }

  public async retrieveSubscription(subscription: Subscription): Promise<SubscriptionProviderInfo> {
    const customer = await this.stripeClient.customers.retrieve(subscription.provider.data.customerId);
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(subscription.provider.data.subscriptionId);

    return this.toProviderInfo(customer, stripeSubscription);
  }

  private async doCreateSubscription(customer: Stripe.customers.ICustomer, subscription: SubscriptionData, allowTrial: boolean = true): Promise<Stripe.subscriptions.ISubscription> {
    const trialOptions = {
      trial_from_plan: allowTrial,
      ...(!allowTrial && { trial_end: 'now' as 'now' })
    };
    return this.stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ plan: subscription.plan.id }],
      ...trialOptions,
      coupon: subscription.provider.couponId,
      metadata: {
        is_from_flo_user_portal: 'true',
        subscription_id: subscription.id,
        location_id: subscription.location.id,
        source_id: subscription.sourceId
      }
    })
  }

  private async ensureStripeCustomer(user: User, subscription: SubscriptionData): Promise<Stripe.customers.ICustomer> {
    const customer = await this.retrieveStripeCustomer(user);
    return customer || this.createStripeCustomer(user, subscription);
  }

  private async retrieveStripeCustomer(user: User): Promise<Stripe.customers.ICustomer | undefined> {
    const customerList: Stripe.IList<Stripe.customers.ICustomer> = await this.stripeClient.customers.list({ email: user.email });
    return _.head(customerList.data);
  }

  private async createStripeCustomer(user: User, subscription: SubscriptionData): Promise<Stripe.customers.ICustomer> {
    return this.stripeClient.customers.create({
      email: user.email,
      source: subscription.provider.token,
      metadata: {
        location_id: subscription.location.id,
        source_id: subscription.sourceId,
        is_from_flo_user_portal: 'true'
      }
    });
  }

  private toProviderInfo(customer: Stripe.customers.ICustomer, subscription: Stripe.subscriptions.ISubscription): SubscriptionProviderInfo {
    return {
      name: this.name,
      isActive: isSubscriptionActive(subscription.status),
      data: {
        customerId: customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        ...(subscription.canceled_at && { canceledAt: new Date(subscription.canceled_at * 1000).toISOString() }),
        ...(subscription.ended_at && { endedAt: new Date(subscription.ended_at * 1000).toISOString() })
      }
    };
  }
}

export default StripeSubscriptionProvider;