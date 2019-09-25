import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Stripe from 'stripe';
import { Subscription, SubscriptionProviderWebhookHandler } from '../../core/api';
import { SubscriptionService } from '../../core/service';
import { isSubscriptionActive } from './StripeUtils';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskOption from 'fp-ts-contrib/lib/TaskOption';

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

    return pipe(
      await this.subscriptionService.getSubscriptionByProviderCustomerId(customer.id),
      Option.fold(
        async () => Promise.resolve(),
        async () => this.makeSubscriptionInactiveByCustomerId(customer.id),
      )
    );
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
          provider: {
            name: 'stripe',
            isActive: isSubscriptionActive(stripeSubscription.status),
            data: {
              customerId: stripeSubscription.customer,
              subscriptionId: stripeSubscription.id
            }
          }
        };

        return TaskOption.fromTask(async () => {
          await this.subscriptionService.createLocalSubscription(subscription);
        });
      }),
      TaskOption.getOrElse(() => async () => Promise.resolve())
    );
  }

  private async handleSubscriptionUpdated(data: any): Promise<void> {
    const { object: stripeSubscription } = data;

    await pipe(
      await this.subscriptionService.getSubscriptionByProviderCustomerId(stripeSubscription.customer),
      Option.fold(
        async () => Promise.resolve(),
        async subscription => {
         const updatedSubscription = {
            plan: {
              id: stripeSubscription.plan.id || subscription.plan.id
            },
            location: {
              id: stripeSubscription.metadata.location_id || subscription.location.id
            },
            sourceId: stripeSubscription.metadata.source_id || subscription.sourceId,
            provider: {
              name: 'stripe',
              isActive: isSubscriptionActive(stripeSubscription.status),
              data: {
                customerId: stripeSubscription.customer,
                subscriptionId: stripeSubscription.id
              }
            }
          };

          await this.subscriptionService.updateSubscription(subscription.id, updatedSubscription);
        }
      )
    );
  }

  private async handleSubscriptionDeleted(data: any): Promise<void> {
    const { object: stripeSubscription } = data;

    return this.makeSubscriptionInactiveByCustomerId(stripeSubscription.customer);
  }

  private async makeSubscriptionInactiveByCustomerId(customerId: string): Promise<void> {

    await pipe(
      await this.subscriptionService.getSubscriptionByProviderCustomerId(customerId),
      Option.fold(
        async () => Promise.resolve(),
        async subscription => {
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
      )
    );
  }
}

export default StripeWebhookHandler;