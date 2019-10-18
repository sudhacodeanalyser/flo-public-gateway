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
  id: string;
  plan: Expandable<SubscriptionPlan>;
  location: Expandable<Location>;
  sourceId: string;
  provider: SubscriptionProviderInfo;
  cancellationReason?: string;
}

export interface CreditCardInfo {
  last4: string;
  expMonth: number;
  expYear: number;
  brand: string;
  isDefault?: boolean;
}

// TODO: Externalize providers somehow?
// Use t.union when we have more than one Provider.
export const ProvidersCodec = t.type({
  name: t.literal('stripe'),
  token: t.string,
  couponId: t.union([t.string, t.undefined])
});

const {
  token,
  ...providerProps
} = ProvidersCodec.props;

const ProviderCreateCodec = t.type({ 
  ...providerProps,
  token: t.union([t.string, t.undefined, t.null])
});

export type ProviderPaymentData = t.TypeOf<typeof ProvidersCodec>;

const SubscriptionCreateCodec = t.strict({
  user: t.strict({
    id: t.string
  }),
  location: t.strict({
    id: t.string
  }),
  plan: t.union([
    t.strict({
      id: t.string
    }),
    t.undefined
  ]),
  sourceId: t.union([t.string, t.undefined]),
  provider: ProviderCreateCodec 
});

export const SubscriptionCreateValidator = SubscriptionCreateCodec;
export type SubscriptionCreate = t.TypeOf<typeof SubscriptionCreateValidator>;