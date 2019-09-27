import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionProviderWebhookHandler, SubscriptionProviderInfo } from '../../core/api';
import { SubscriptionService } from '../../core/service';
import { isSubscriptionActive } from './StripeUtils';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskOption from 'fp-ts-contrib/lib/TaskOption';

type GetSubscription = (subcription: Stripe.subscriptions.ISubscription) => Promise<Option.Option<Subscription>>;

@injectable()
class StripeWebhookHandler implements SubscriptionProviderWebhookHandler {
  public name: string = 'stripe';
  private eventMap: { [key: string]: ((data: any) => Promise<void>) };

  constructor(
    @inject('StripeClient') private stripeClient: Stripe,
    @inject('SubscriptionService') private subscriptionService: SubscriptionService
  ) {
    this.eventMap = {
      'customer.deleted': this.handleSubscriptionUpdated.bind(
        this,
        sub => this.subscriptionService.getSubscriptionByProviderCustomerId(this.getCustomerId(sub))
      ),
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

  private async handleSubscriptionCreated(data: any): Promise<void> {
    const { object: stripeSubscription } = data;
    
    await pipe(
      TaskOption.fromOption(
        await this.subscriptionService.getSubscriptionByProviderCustomerId(stripeSubscription.customer)
      ),
      TaskOption.chain(() =>
        async () => Option.fromNullable(await this.stripeClient.customers.retrieve(stripeSubscription.customer))
      ),
      TaskOption.chain(customer => {
        const locationId = stripeSubscription.metadata.location_id;
        const subscription = {
          plan: {
            id: stripeSubscription.plan.id
          },
          location: {
            id: locationId
          },
          sourceId: stripeSubscription.metadata.source_id || 'stripe',
          provider: this.formatProviderData(stripeSubscription)
        };

        return TaskOption.fromTask(async () => {
          await this.subscriptionService.createLocalSubscription(subscription);
        });
      }),
      TaskOption.getOrElse(() => async () => Promise.resolve())
    );
  }

  private async handleSubscriptionUpdated(getSubscription: GetSubscription, data: any): Promise<void> {
    const { object } = data;
    const stripeSubscription: Stripe.subscriptions.ISubscription = object;
    const customer = this.getCustomerId(stripeSubscription);

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
            provider: this.formatProviderData(stripeSubscription)
          };

          await this.subscriptionService.updateSubscription(subscription.id, updatedSubscription);
        }
      )
    );
  }

  private formatProviderData(stripeSubscription: Stripe.subscriptions.ISubscription): SubscriptionProviderInfo {
    const customer = this.getCustomerId(stripeSubscription);

    return {
      name: 'stripe',
      isActive: isSubscriptionActive(stripeSubscription.status),
      data: {
        status: stripeSubscription.status,
        customerId: customer,
        subscriptionId: stripeSubscription.id,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        canceledAt: !stripeSubscription.canceled_at ?
           undefined :
           new Date(stripeSubscription.canceled_at * 1000).toISOString(),
        cancelAtPeriodEnd: !!stripeSubscription.cancel_at_period_end
      }
    };
  }

  private getCustomerId(stripeSubscription: Stripe.subscriptions.ISubscription): string {
    return _.isString(stripeSubscription.customer) ? 
      stripeSubscription.customer : 
      stripeSubscription.customer.id;
  }
}

export default StripeWebhookHandler;