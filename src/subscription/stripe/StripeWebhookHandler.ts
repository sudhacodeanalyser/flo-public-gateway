import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionProviderWebhookHandler, SubscriptionProviderInfo } from '../../core/api';
import { SubscriptionService } from '../../core/service';
import { isSubscriptionActive } from './StripeUtils';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import StripeSubscriptionProvider from './StripeSubscriptionProvider';

type GetSubscription = (subcription: Stripe.subscriptions.ISubscription) => Promise<Option.Option<Subscription>>;
type EventData = Stripe.events.IEvent['data'];
type StripeObject = EventData['object'];

@injectable()
class StripeWebhookHandler implements SubscriptionProviderWebhookHandler {
  public name: string = 'stripe';
  private eventMap: { [key: string]: ((data: any) => Promise<void>) };

  constructor(
    @inject('StripeClient') private stripeClient: Stripe,
    @inject('SubscriptionService') private subscriptionService: SubscriptionService,
    @inject('StripeSubscriptionProvider') private stripeSubscriptionProvider: StripeSubscriptionProvider
  ) {
    this.eventMap = {
      'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(
        this, 
        sub => this.subscriptionService.getSubscriptionByRelatedEntityId(sub.metadata.location_id)
      ),
      'customer.subscription.deleted': this.handleSubscriptionUpdated.bind(
        this,
        sub => this.subscriptionService.getSubscriptionByRelatedEntityId(sub.metadata.location_id)
      )
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

  private async handleSubscriptionCreated(data: EventData): Promise<void> {

    if (!this.isSubscriptionObject(data.object)) {
      throw new Error('Object is not subscription');
    }

    const stripeSubscription = data.object;
    const locationId = stripeSubscription.metadata.location_id;
    const subscription = {
      plan: {
        id: stripeSubscription.plan ? stripeSubscription.plan.id : 'unknown'
      },
      location: {
        id: locationId
      },
      sourceId: stripeSubscription.metadata.source_id || 'stripe',
      provider: this.stripeSubscriptionProvider.formatProviderData(stripeSubscription)
    };

    await pipe(
      await this.subscriptionService.getSubscriptionByRelatedEntityId(locationId),
      Option.fold(
        async () => {
          await this.subscriptionService.createLocalSubscription(subscription);
        },
        async existingSubscription => {
          await this.subscriptionService.updateSubscription(existingSubscription.id, subscription);
        }
      )
    );
  }

  private async handleSubscriptionUpdated(getSubscription: GetSubscription, data: EventData): Promise<void> {

    if (!this.isSubscriptionObject(data.object)) {
      throw new Error('Object is not subscription');
    }

    const stripeSubscription = data.object;
    const customer = this.stripeSubscriptionProvider.getCustomerId(stripeSubscription);

    await pipe(
      await getSubscription(stripeSubscription),
      Option.fold(
        async () => Promise.resolve(),
        async subscription => {
         const updatedSubscription: Partial<Subscription> = {
            plan: {
              id: (stripeSubscription.plan && stripeSubscription.plan.id) || subscription.plan.id
            },
            location: {
              id: stripeSubscription.metadata.location_id || subscription.location.id
            },
            sourceId: stripeSubscription.metadata.source_id || subscription.sourceId,
            provider: this.stripeSubscriptionProvider.formatProviderData(stripeSubscription)
          };

          await this.subscriptionService.updateSubscription(subscription.id, updatedSubscription);
        }
      )
    );
  }

  private isSubscriptionObject(object: StripeObject): object is Stripe.subscriptions.ISubscription {
    return object.object === 'subscription';
  }
}

export default StripeWebhookHandler;