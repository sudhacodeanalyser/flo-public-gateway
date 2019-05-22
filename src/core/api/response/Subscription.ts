import _ from 'lodash';
import {Omit, Subscription as SubscriptionModel, SubscriptionProviderData} from '../../api';

type IsActive = {
  isActive?: boolean
};
type ProviderInfo = {
  providerInfo: Omit<SubscriptionProviderData, 'customerId' | 'subscriptionId'>
};
type SubscriptionSansProvider = Omit<SubscriptionModel, 'provider'>
export type SubscriptionResponse = SubscriptionSansProvider  & IsActive & ProviderInfo;

export class Subscription {
  public static fromModel(subscription: SubscriptionModel): SubscriptionResponse {
    // TODO: Figure out a better way of doing this.
    return {
      ...(_.pickBy(subscription, (value, key) => key !== 'provider')),
      isActive: subscription.provider.isActive,
      providerInfo: {
        ...(_.pickBy(subscription.provider.data, (value, key) => key !== 'customerId' && key !== 'subscriptionId'))
      }
    } as any as SubscriptionResponse;
  }
}

