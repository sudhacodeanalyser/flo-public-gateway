import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionData, SubscriptionProvider, SubscriptionProviderInfo, CreditCardInfo, User } from '../../core/api';
import { isSubscriptionActive } from './StripeUtils';
import * as Option from 'fp-ts/lib/Option';
import ValidationError from '../../core/api/error/ValidationError';
import ResourceNotFoundError from '../../core/api/error/ResourceDoesNotExistError';

type StripeObject = { object: string };

@injectable()
class StripeSubscriptionProvider implements SubscriptionProvider {
  public name: string = 'stripe';

  constructor(
    @inject('StripeClient') private stripeClient: Stripe
  ) {}

  public async createSubscription(user: User, subscription: SubscriptionData, allowTrial?: boolean): Promise<SubscriptionProviderInfo> {
    const customer = await this.ensureStripeCustomer(user);

    if (!subscription.provider.token && !customer.default_source) {
      throw new ValidationError('No payment method submitted or on file.');
    }

    if (subscription.provider.token) {
      await this.createPaymentSource(customer.id, subscription.provider.token);
    }

    const stripeSubscription = await this.doCreateSubscription(customer, subscription, allowTrial);

    return this.formatProviderData(stripeSubscription);
  }

  public async updateUserData(subscription: Subscription, userUpdate: Partial<User>): Promise<SubscriptionProviderInfo> {
    const stripeSubscription = await this.retrieveSubscription(subscription);

    if (userUpdate.email) {
      const customerId = stripeSubscription.data.customerId;

      await this.stripeClient.customers.update(customerId, { email: userUpdate.email });
    }

    return stripeSubscription;
  }

  public async retrieveSubscription(subscription: Subscription): Promise<SubscriptionProviderInfo> {
    const customer = await this.stripeClient.customers.retrieve(subscription.provider.data.customerId);
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(subscription.provider.data.subscriptionId);

    return this.formatProviderData(stripeSubscription);
  }

  public async cancelSubscription(subscription: Subscription, shouldCancelImmediately: boolean = false): Promise<SubscriptionProviderInfo> {
    const stripeSubscriptionId = subscription.provider.data.subscriptionId;
    const updatedStripeSubscription = await (
      shouldCancelImmediately ?
        this.stripeClient.subscriptions.del(stripeSubscriptionId) :
        this.stripeClient.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true })
    );

    return this.formatProviderData(updatedStripeSubscription);
  }

  public getCustomerId(stripeSubscription: Stripe.subscriptions.ISubscription): string {
    return _.isString(stripeSubscription.customer) ? 
      stripeSubscription.customer : 
      stripeSubscription.customer.id;
  }

  public async getPaymentSources(user: User): Promise<CreditCardInfo[]> {
    const stripeCustomer = await this.retrieveStripeCustomer(user);

    if (!stripeCustomer) {
      return [];
    }

    return this.formatPaymentSources(stripeCustomer);
  }

  public async updatePaymentSource(user: User, token: string): Promise<CreditCardInfo[]> {
    const stripeCustomer = await this.ensureStripeCustomer(user);
    const updatedStripeCustomer = await this.createPaymentSource(stripeCustomer.id, token);

    return this.formatPaymentSources(updatedStripeCustomer);
  }

  public formatProviderData(stripeSubscription: Stripe.subscriptions.ISubscription): SubscriptionProviderInfo {
    const customerId = this.getCustomerId(stripeSubscription);

    return {
      name: this.name,
      isActive: isSubscriptionActive(stripeSubscription.status),
      data: {
        status: stripeSubscription.status,
        customerId,
        subscriptionId: stripeSubscription.id,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        canceledAt: !stripeSubscription.canceled_at ?
           undefined :
           new Date(stripeSubscription.canceled_at * 1000).toISOString(),
        endedAt: !stripeSubscription.ended_at ?
          undefined :
          new Date(stripeSubscription.ended_at * 1000).toISOString(),
        cancelAtPeriodEnd: !!stripeSubscription.cancel_at_period_end
      }
    };
  }

  public async getCanceledSubscriptions(user: User): Promise<SubscriptionProviderInfo[]> {
    const stripeCustomer = await this.retrieveStripeCustomer(user);

    if (!stripeCustomer) {
      return [];
    }

    const subscriptions = await this.stripeClient.subscriptions.list({
      customer: stripeCustomer.id,
      status: 'canceled',
    });

    return (subscriptions ? subscriptions.data : []).map(subscription => this.formatProviderData(subscription)); 
  }

  public async reactiveSubscription(subscription: Subscription): Promise<SubscriptionProviderInfo> {
    const stripeSubscriptionId = subscription.provider.data.subscriptionId;
    const stripeSubscription = await this.stripeClient.subscriptions.retrieve(stripeSubscriptionId);

    if (!stripeSubscription) {
      throw new ResourceNotFoundError('Subscription does not exist.');
    }

    const updatedStripeSubscription = await this.stripeClient.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
      ...(
        subscription.plan && subscription.plan.id && 
        (!stripeSubscription.plan || stripeSubscription.plan.id !== subscription.plan.id) ?
          {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                plan: subscription.plan.id
              }
            ]
          } :
          {}
      )
    });

    return this.formatProviderData(updatedStripeSubscription);
  }

  private async createPaymentSource(stripeCustomerId: string, token: string): Promise<Stripe.customers.ICustomer> {
    const source = await this.stripeClient.customers.createSource(stripeCustomerId, { source: token });

    return this.stripeClient.customers.update(stripeCustomerId, { default_source: source.id });
  }

  private async doCreateSubscription(customer: Stripe.customers.ICustomer, subscription: SubscriptionData, allowTrial: boolean = false): Promise<Stripe.subscriptions.ISubscription> {

    if (!subscription.plan) {
     throw new ValidationError('A plan must be specified.');
    }

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
        ...(subscription.sourceId ? { source_id: subscription.sourceId } : {})
      }
    });
  }

  private formatPaymentSources(customer: Stripe.customers.ICustomer): CreditCardInfo[] {
    const defaultSource = customer.default_source;
    const defaultSourceId = _.isString(defaultSource) ?
      defaultSource :
      defaultSource && this.isCreditCard(defaultSource) ?
        defaultSource.id :
        '';

    return (customer.sources ? customer.sources.data : []) 
      .filter(source => 
        source && !_.isString(source) && this.isCreditCard(source)
      )
      .map(source => {
        const {
          last4,
          exp_month,
          exp_year,
          brand,
          id
        } = source as Stripe.cards.ICard;

        return {
          last4,
          expMonth: exp_month,
          expYear: exp_year,
          brand,
          isDefault: id === defaultSourceId 
        };
      });
  }

  private isCreditCard(object: StripeObject): object is Stripe.cards.ICard {
    return object.object === 'card';
  }

  private async ensureStripeCustomer(user: User, subscription?: SubscriptionData): Promise<Stripe.customers.ICustomer> {
    const customer = await this.retrieveStripeCustomer(user);
    return customer || this.createStripeCustomer(user, subscription);
  }

  private async retrieveStripeCustomer(user: User): Promise<Stripe.customers.ICustomer | undefined> {
    const customerList: Stripe.IList<Stripe.customers.ICustomer> = await this.stripeClient.customers.list({ email: user.email });
    return _.head(customerList.data);
  }

  private async createStripeCustomer(user: User, subscription?: SubscriptionData): Promise<Stripe.customers.ICustomer> {
    return this.stripeClient.customers.create({
      email: user.email,
      source: subscription && (subscription.provider.token || undefined),
      metadata: {
        account_id: user.account.id,
        ...(subscription && subscription.sourceId ? { source_id: subscription.sourceId } : {}),
        is_from_flo_user_portal: 'true'
      }
    });
  }
}

export default StripeSubscriptionProvider;