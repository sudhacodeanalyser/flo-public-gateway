import { Subscription, SubscriptionCreate, SubscriptionProviderInfo, CreditCardInfo, User } from '../api';

type Id = { id: string };
export type SubscriptionData = SubscriptionCreate & Id;

export interface SubscriptionProvider {
  readonly name: string;

  createSubscription(user: User, subscription: SubscriptionData, allowTrial?: boolean): Promise<SubscriptionProviderInfo>;

  retrieveSubscription(subscription: Subscription): Promise<SubscriptionProviderInfo>;

  cancelSubscription(subscription: Subscription, shouldCancelImmediately?: boolean): Promise<SubscriptionProviderInfo>;

  reactiveSubscription(subscription: Subscription): Promise<SubscriptionProviderInfo>;

  getPaymentSources(user: User): Promise<CreditCardInfo[]>;

  updatePaymentSource(user: User, paymentSource: string): Promise<CreditCardInfo[]>;

  getCanceledSubscriptions(user: User): Promise<SubscriptionProviderInfo[]>;

  updateUserData(subscription: Subscription, userUpdate: Partial<User>): Promise<SubscriptionProviderInfo>;
}

export interface SubscriptionProviderWebhookHandler {
  readonly name: string;

  handle(event: { [key: string]: any }): Promise<void>;
}