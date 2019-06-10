import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionProviderWebhookHandler } from '../../core/api';
import { SubscriptionService } from '../../core/service';
import { isSubscriptionActive } from './StripeUtils';

@injectable()
class StripeWebhookHandler implements SubscriptionProviderWebhookHandler {
  public name: string = 'stripe';
  private eventMap: { [key: string]: ((data: any) => Promise<void>) };

  constructor(
    @inject('StripeClient') private stripeClient: Stripe,
    @inject('SubscriptionService') private subscriptionService: SubscriptionService
  ) {
    this.eventMap = {
      'customer.deleted': this.handleCustomerDeleted.bind(this),
      'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(this),
      'customer.subscription.deleted': this.handleSubscriptionDeleted.bind(this)
    }
  }

  public async handle(event: Stripe.events.IEvent): Promise<void> {
    const { type, data } = event;
    const handler = this.eventMap[type.toLowerCase()];

    if (!handler) {
      return Promise.resolve();
    }

    return handler(data);
  }

  private async handleCustomerDeleted(data: any): Promise<void> {
    const { object: customer } = data;

    const subscription: Subscription | {} = await this.subscriptionService.getSubscriptionByProviderCustomerId(customer.id);

    if (_.isEmpty(subscription)) {
      return Promise.resolve();
    }

    return this.makeSubscriptionInactiveByCustomerId(customer.id);
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    const { object: stripeSubscription } = data;

    const maybeSubscription = await this.subscriptionService.getSubscriptionByProviderCustomerId(stripeSubscription.customer);
    if (!_.isEmpty(maybeSubscription)) {
      return Promise.resolve();
    }

    const customer = await this.stripeClient.customers.retrieve(stripeSubscription.customer);
    const locationId = await customer && customer.metadata.location_id;

    if (!locationId) {
      return Promise.resolve();
    }

    const subscription = {
      plan: {
        id: stripeSubscription.plan.id
      },
      location: {
        id: locationId
      },
      sourceId: stripeSubscription.metadata.source_id || 'stripe',
      provider: {
        name: 'stripe',
        isActive: isSubscriptionActive(stripeSubscription.status),
        data: {
          customerId: stripeSubscription.customer,
          subscriptionId: stripeSubscription.id
        }
      }
    }
    await this.subscriptionService.createLocalSubscription(subscription);
  }

  private async handleSubscriptionUpdated(data: any): Promise<void> {
    const { object: stripeSubscription } = data;

    const subscription = await this.subscriptionService.getSubscriptionByProviderCustomerId(stripeSubscription.customer);

    if (_.isEmpty(subscription)) {
      return Promise.resolve()
    }

    const updatedSubscription = {
      plan: {
        id: stripeSubscription.plan.id || (subscription as Subscription).plan.id
      },
      location: {
        id: stripeSubscription.metadata.location_id || (subscription as Subscription).location.id
      },
      sourceId: stripeSubscription.metadata.source_id || (subscription as Subscription).sourceId,
      provider: {
        name: 'stripe',
        isActive: isSubscriptionActive(stripeSubscription.status),
        data: {
          customerId: stripeSubscription.customer,
          subscriptionId: stripeSubscription.id
        }
      }
    }
    await this.subscriptionService.updateSubscription((subscription as Subscription).id, updatedSubscription);
  }

  private async handleSubscriptionDeleted(data: any): Promise<void> {
    const { object: stripeSubscription } = data;

    return this.makeSubscriptionInactiveByCustomerId(stripeSubscription.customer);
  }

  private async makeSubscriptionInactiveByCustomerId(customerId: string): Promise<void> {
    const maybeSubscription = await this.subscriptionService.getSubscriptionByProviderCustomerId(customerId);

    if (_.isEmpty(maybeSubscription)) {
      return Promise.resolve();
    }

    const subscription = (maybeSubscription as Subscription);
    const inactivePartialSubscription = {
      provider: {
        name: 'stripe',
        isActive: false,
        data: {
          isActive: false,
          customerId: subscription.provider.data.customerId,
          subscriptionId: subscription.provider.data.subscriptionId
        }
      }
    };

    await this.subscriptionService.updateSubscription(subscription.id, inactivePartialSubscription);
  }
}

export default StripeWebhookHandler;