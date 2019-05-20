import { Subscription, SubscriptionCreate, SubscriptionProviderInfo, User } from '../api';

type Id = { id: string };
export type SubscriptionData = SubscriptionCreate & Id;

export interface SubscriptionProvider {
  readonly name: string;

  createSubscription(user: User, subscription: SubscriptionData): Promise<SubscriptionProviderInfo>;

  retrieveSubscription(subscription: Subscription): Promise<SubscriptionProviderInfo>;
}

export interface SubscriptionProviderWebhookHandler {
  readonly name: string;

  handle(event: { [key: string]: any }): Promise<void>;
}