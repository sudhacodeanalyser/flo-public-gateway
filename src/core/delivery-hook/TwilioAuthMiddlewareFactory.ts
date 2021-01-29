import client from 'twilio';
import UnauthorizedError from '../../auth/UnauthorizedError';
import Request from "../api/Request";
import * as express from 'express';
import {inject, injectable} from "inversify";

@injectable()
class TwilioAuthMiddlewareFactory {
  @inject('TwilioAuthToken') private twilioAuthToken: string;
  @inject('PublicGatewayHost') private host: string;

  public create(originHost?: string): express.Handler {
    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      try {
        const url = 'https://' + (originHost || this.host || req.get('host')) + req.originalUrl;
        const twilioSignature = req.get('x-twilio-signature') || '';

        if (client.validateRequest(this.twilioAuthToken, twilioSignature, url, req.body)) {
          return next();
        } else {
          return next(new UnauthorizedError('Invalid Twilio signature.'));
        }
      } catch (err) {
        next(err);
      }
    };
  }
}

export default TwilioAuthMiddlewareFactory;
