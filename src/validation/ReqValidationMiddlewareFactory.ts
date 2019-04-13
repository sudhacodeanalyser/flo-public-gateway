import * as t from 'io-ts';
// tslint:disable no-submodule-imports
import { PathReporter } from 'io-ts/lib/PathReporter';
import Request from '../core/api/Request';
import * as express from 'express';
import { injectable } from 'inversify';

@injectable()
class ReqValidationMiddlewareFactory {

  public create(reqType: t.Type<any>): express.RequestHandler {
    return (req: Request, res: express.Response, next: express.NextFunction) => {
      const result = reqType.decode(req);
      const report = PathReporter.report(result);

      const onSuccess = () => next();
      const onFailure = () => {
        // TODO: This should not directly send a response, but instead
        // call next(err) to pass through the centralized error handling
        // middleware
        res.status(400).json({
          success: false,
          errors: report,
        });
      };

      result.fold(onSuccess, onFailure);
    };
  }

}

export default ReqValidationMiddlewareFactory;