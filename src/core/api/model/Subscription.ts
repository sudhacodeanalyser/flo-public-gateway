import * as t from 'io-ts';
import { Expandable, Location, TimestampedModel } from '../../api';

export interface SubscriptionPlan  extends TimestampedModel {
  id: string,
  features: string[],
  monthlyCost: number
}

// TODO: Move this out.
export interface StripeProviderData {
  customerId: string,
  subscriptionId: string,
  status?: string,
  currentPeriodStart?: string,
  currentPeriodEnd?: string,
  cancelAtPeriodEnd?: boolean,
  canceledAt?: string,
  endedAt?: string
}

export type SubscriptionProviderData = StripeProviderData // | AnotherProviderData

export interface SubscriptionProviderInfo {
  name: string,
  isActive: boolean,
  data: SubscriptionProviderData
}

export interface Subscription extends TimestampedModel {
  id: string,
  plan: Expandable<SubscriptionPlan>,
  location: Expandable<Location>,
  sourceId: string,
  provider: SubscriptionProviderInfo
}

// TODO: Externalize providers somehow?
// Use t.union when we have more than one Provider.
const ProvidersCodec = t.strict({
  name: t.literal('stripe'),
  token: t.string,
  couponId: t.union([t.string, t.undefined])
});

const SubscriptionCreateCodec = t.strict({
  user: t.strict({
    id: t.string
  }),
  location: t.strict({
    id: t.string
  }),
  plan: t.strict({
    id: t.string
  }),
  sourceId: t.string,
  provider: ProvidersCodec
});

export const SubscriptionCreateValidator = SubscriptionCreateCodec;
export type SubscriptionCreate = t.TypeOf<typeof SubscriptionCreateValidator>;