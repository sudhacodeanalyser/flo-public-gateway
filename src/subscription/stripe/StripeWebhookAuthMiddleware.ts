import express from 'express';
import { inject, injectable } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import Stripe from 'stripe';
import UnauthorizedError from '../../auth/UnauthorizedError';
import Request from '../../core/api/Request';

@injectable()
class StripeWebhookAuthMiddleware extends BaseMiddleware {
  constructor(
    @inject('StripeWebhookSecret') private stripeWebhookSecret: string,
    @inject('StripeClient') private stripeClient: Stripe
  ) {
    super();
  }

  public handler(req: Request, res: express.Response, next: express.NextFunction): void {
    const signature = req.headers['stripe-signature'];
    const payload = req.rawBody;

    if (!signature) {
      return next(new UnauthorizedError('Invalid signature.'));
    }

    try {
      // Will throw StripeSignatureVerificationError exception if signature is invalid
      this.stripeClient.webhooks.constructEvent(payload, signature, this.stripeWebhookSecret);
      next();
    } catch (err: any) {
      if (err.type === 'StripeSignatureVerificationError') {
        return next(new UnauthorizedError('Invalid signature.'));
      }
      return next(err);
    }
  }
}

export default StripeWebhookAuthMiddleware;