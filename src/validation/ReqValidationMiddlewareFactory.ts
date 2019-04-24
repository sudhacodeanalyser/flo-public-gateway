import _ from 'lodash';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import Request from '../core/api/Request';
import * as express from 'express';
import { injectable } from 'inversify';
import ReqValidationError from './ReqValidationError';

@injectable()
class ReqValidationMiddlewareFactory {

  public create(reqType: t.Type<any>): express.RequestHandler {
    return (req: Request, res: express.Response, next: express.NextFunction) => {
      const result = reqType.decode(req);
      // TODO: Figure out a better of validating (this relies on t.exact)
      const bodyDiff = _.differenceWith(_.keys(req.body), _.keys(result.value.body), _.isEqual);
      const validationPassed = _.isEmpty(bodyDiff);

      if (result.isRight() && validationPassed) {
        next();
      } else {
        const message = result.isLeft() ?
          PathReporter.report(result).join(', ') :
          `Invalid request parameters: ${bodyDiff}`;
        next(new ReqValidationError(message));
      }
    };
  }

}

export default ReqValidationMiddlewareFactory;