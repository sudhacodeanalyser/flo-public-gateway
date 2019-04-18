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
      const report = PathReporter.report(result);

      if (result.isRight()) {
        next();
      } else {
        next(new ReqValidationError(report.join(', ')));
      }
    };
  }

}

export default ReqValidationMiddlewareFactory;