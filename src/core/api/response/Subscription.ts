import * as _ from 'lodash';
import { Expandable, Omit, Subscription as SubscriptionModel, SubscriptionProviderData } from '../../api';
import { SubscriptionProviderInfo } from '../model/Subscription';
import { Location, LocationResponse, Response } from './index';

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

// TODO: Find a better place for this.
const statusMap: { [key: string]: { [key: string]: string } } = {
  stripe: {
    active: 'active',
    trialing: 'trial',
    canceled: 'canceled',
    unpaid: 'delinquent',
    past_due: 'delinquent',
    incomplete: 'unknown',
    incomplete_expired: 'unknown'
  }
}

const mapProviderStatus = (provider: string, status: string): string => {
  const providerStatuses: { [key: string]: string } = statusMap[provider] || {};
  return providerStatuses[status] || 'unknown';
}

export class Subscription implements Response {
  public static fromModel(subscription: Expandable<SubscriptionModel>): SubscriptionResponse {
    // TODO: Figure out a better way of doing this.
    const safeProvider = (subscription && subscription.provider) || {};
    const safeProviderData = (safeProvider as SubscriptionProviderInfo).data || {};

    const providerName = (safeProvider as SubscriptionProviderInfo).name || '';
    const providerStatus = safeProviderData.status || '';

    return {
      ...(_.pickBy(subscription, (value, key) => key !== 'provider')),
      isActive: _.get(subscription, 'provider.isActive') as boolean | undefined,
      status: mapProviderStatus(providerName, providerStatus),
      providerInfo: _.pickBy(safeProviderData, (value, key) =>
        key !== 'customerId' && key !== 'subscriptionId'
      ),
      location: subscription.location && Location.fromModel(subscription.location)
    } as any as SubscriptionResponse;
  }
}

