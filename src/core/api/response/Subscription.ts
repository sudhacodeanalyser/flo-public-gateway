import _ from 'lodash';
import { Omit, Subscription as SubscriptionModel, SubscriptionProviderData, Expandable} from '../../api';
import { Response, Location, LocationResponse } from './index';

type IsActive = {
  isActive?: boolean
};
type ProviderInfo = {
  providerInfo?: Omit<SubscriptionProviderData, 'customerId' | 'subscriptionId'>
};
type SubscriptionSansProvider = Omit<Expandable<SubscriptionModel>, 'provider' | 'location'>

export interface SubscriptionResponse extends SubscriptionSansProvider, IsActive, ProviderInfo {
  location?: LocationResponse
}

export class Subscription implements Response {
  public static fromModel(subscription: Expandable<SubscriptionModel>): SubscriptionResponse {
    // TODO: Figure out a better way of doing this.
    return {
      ...(_.pickBy(subscription, (value, key) => key !== 'provider')),
      isActive: _.get(subscription, 'provider.isActive') as boolean | undefined,
      providerInfo: subscription && subscription.provider && subscription.provider.data && _.pickBy(
        subscription.provider.data, 
        (value, key) => key !== 'customerId' && key !== 'subscriptionId'
      ),
      location: subscription.location && Location.fromModel(subscription.location)
    } as any as SubscriptionResponse;
  }
}

