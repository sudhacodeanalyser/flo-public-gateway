import Stripe from 'stripe';
import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { SubscriptionProvider, SubscriptionProviderWebhookHandler } from '../core/api';
import StripeSubscriptionProvider from './stripe/StripeSubscriptionProvider';
import StripeWebhookHandler from './stripe/StripeWebhookHandler';
import StripeWebhookAuthMiddleware from './stripe/StripeWebhookAuthMiddleware';
import HttpAgent, { HttpsAgent } from 'agentkeepalive';

export default new ContainerModule((bind: interfaces.Bind) => {

  bind<Stripe>('StripeClient').toDynamicValue((context: interfaces.Context) => {
    const httpsAgent = context.container.get<HttpsAgent>('HttpsAgent');
    const stripeClient = new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-08-16',
      httpAgent: httpsAgent
    });

    return stripeClient;
  })
  .inSingletonScope();
  bind<StripeSubscriptionProvider>('StripeSubscriptionProvider').to(StripeSubscriptionProvider);
  bind<SubscriptionProvider>('SubscriptionProvider').to(StripeSubscriptionProvider);
  bind<SubscriptionProviderWebhookHandler>('SubscriptionProviderWebhookHandler').to(StripeWebhookHandler);
  bind<string>('StripeWebhookSecret').toConstantValue(config.stripeWebhookSecret);
  bind<StripeWebhookAuthMiddleware>('StripeWebhookAuthMiddleware').to(StripeWebhookAuthMiddleware);
})