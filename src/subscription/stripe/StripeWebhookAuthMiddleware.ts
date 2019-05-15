import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Stripe from 'stripe';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';

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
    } catch (err) {
      if (err.type == 'StripeSignatureVerificationError') {
        return next(new UnauthorizedError('Invalid signature.'));
      }
      return next(err);
    }
  }
}

export default StripeWebhookAuthMiddleware;