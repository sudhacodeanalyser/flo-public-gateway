import Stripe from 'stripe';
import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { SubscriptionProvider, SubscriptionProviderWebhookHandler } from '../core/api';
import StripeSubscriptionProvider from './stripe/StripeSubscriptionProvider';
import StripeWebhookHandler from './stripe/StripeWebhookHandler';
import StripeWebhookAuthMiddleware from './stripe/StripeWebhookAuthMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<Stripe>('StripeClient').toConstantValue(new Stripe(config.stripeSecretKey));
  bind<StripeSubscriptionProvider>('StripeSubscriptionProvider').to(StripeSubscriptionProvider);
  bind<SubscriptionProvider>('SubscriptionProvider').to(StripeSubscriptionProvider);
  bind<SubscriptionProviderWebhookHandler>('SubscriptionProviderWebhookHandler').to(StripeWebhookHandler);
  bind<string>('StripeWebhookSecret').toConstantValue(config.stripeWebhookSecret);
  bind<StripeWebhookAuthMiddleware>('StripeWebhookAuthMiddleware').to(StripeWebhookAuthMiddleware);
})