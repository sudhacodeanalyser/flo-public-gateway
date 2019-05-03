import { Expandable, Location, TimestampedModel, User } from '../api';
import * as t from 'io-ts';

export interface SubscriptionPlan  extends TimestampedModel {
  id: string
  features: string[]
  monthlyCost: number
}

export interface Subscription extends TimestampedModel {
  id: string,
  plan: Expandable<SubscriptionPlan>
  location: Expandable<Location>
  sourceId: string
}

export interface SubscriptionProvider {
  name: string
  customerId: string
  subscriptionId: string
}

// TODO: Externalize providers somehow?
// Use t.union when we have more than one Provider.
const ProvidersCodec = t.strict({
  name: t.literal('stripe'),
  token: t.string,
  couponId: t.string
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