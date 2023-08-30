import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionProviderWebhookHandler, SubscriptionProviderInfo } from '../../core/api';
import { SubscriptionService } from '../../core/service';
import { isSubscriptionActive } from './StripeUtils';
import * as Option from 'fp-ts/lib/Option';
import * as AsyncOption from 'fp-ts-contrib/lib/TaskOption';
import { pipe } from 'fp-ts/lib/pipeable';
import StripeSubscriptionProvider from './StripeSubscriptionProvider';
import Logger from 'bunyan';

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
    @inject('StripeSubscriptionProvider') private stripeSubscriptionProvider: StripeSubscriptionProvider,
    @inject('Logger') private readonly logger: Logger
  ) {
    this.eventMap = {
      'customer.subscription.created': this.handleSubscriptionCreated.bind(this),
      'customer.subscription.updated': this.handleSubscriptionUpdated.bind(
        this, 
        async sub => {

          if (!sub?.metadata?.location_id) {
            return Option.none;
          }

          return this.subscriptionService.getSubscriptionByRelatedEntityId(sub.metadata.location_id)
        }
      ),
      'customer.subscription.deleted': this.handleSubscriptionUpdated.bind(
        this,
        async sub => {
          
          if (!sub?.metadata?.location_id) {
            return Option.none;
          }

          return this.subscriptionService.getSubscriptionByRelatedEntityId(sub.metadata.location_id)
        }
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
    const locationId = stripeSubscription.metadata.location_id as string | undefined;
    const customerId = _.isString(stripeSubscription.customer) ? stripeSubscription.customer : stripeSubscription.customer.id;
    const subscription = {
      plan: {
        id: stripeSubscription.plan ? stripeSubscription.plan.id : 'unknown'
      },
      location: locationId ? {
        id: locationId
      } : undefined,
      sourceId: stripeSubscription.metadata.source_id || 'stripe',
      provider: this.stripeSubscriptionProvider.formatProviderData(stripeSubscription)
    };

    await pipe(
      async () => locationId ? this.subscriptionService.getSubscriptionByRelatedEntityId(locationId) : AsyncOption.none(),
      AsyncOption.alt(() => 
        async () => Option.fromNullable((await this.subscriptionService.getSubscriptionByProviderCustomerId(customerId))[0])
      ),
      AsyncOption.fold(
        () => {
          return async () => {
            if (subscription.location && locationId) {
              await this.subscriptionService.createLocalSubscription({
                ...subscription,
                location: { id: locationId || '' }
              });
            }
          };
        },
        existingSubscription => {
          return async () => {
            await this.subscriptionService.updateSubscription(existingSubscription.id, _.pickBy(subscription, prop => !_.isEmpty(prop)))
          };
        }
      )
    )();
  }

  private async handleSubscriptionUpdated(getSubscription: GetSubscription, data: EventData): Promise<void> {

    if (!this.isSubscriptionObject(data.object)) {
      throw new Error('Object is not subscription');
    }

    const stripeSubscription = data.object;
    const customer = this.stripeSubscriptionProvider.getCustomerId(stripeSubscription);

    await pipe(
      await getSubscription(stripeSubscription),
      Option.chain(subscription => {
        // Don't allow webhook to override data for an active subscription whose ID does not match
        if (
          subscription?.provider.isActive && 
          subscription?.provider?.data?.subscriptionId &&
          subscription?.provider?.data?.subscriptionId !== stripeSubscription.id
        ) {
          this.logger.info(data, 'Duplicate subscription');
          return Option.none;
        } 

        return Option.some(subscription);
      }),
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