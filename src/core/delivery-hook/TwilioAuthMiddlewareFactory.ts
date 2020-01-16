import client from 'twilio';
import UnauthorizedError from '../../auth/UnauthorizedError';
import Request from "../api/Request";
import * as express from 'express';
import {inject, injectable} from "inversify";

@injectable()
class TwilioAuthMiddlewareFactory {
  @inject('TwilioAuthToken') private twilioAuthToken: string;

  public create(): express.Handler {
    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      try {
        const url = 'https://' + req.get('host') + req.originalUrl;
        const twilioSignature = req.get('x-twilio-signature') || '';

        // tslint:disable-next-line:no-console
        console.log('####################');
        // tslint:disable-next-line:no-console
        console.log('####################');
        // tslint:disable-next-line:no-console
        console.log('TwilioAuthMiddlewareFactory');
        // tslint:disable-next-line:no-console
        console.log(url);
        // tslint:disable-next-line:no-console
        console.log(twilioSignature);
        // tslint:disable-next-line:no-console
        console.log(req.body);
        // tslint:disable-next-line:no-console
        console.log(this.twilioAuthToken);

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
