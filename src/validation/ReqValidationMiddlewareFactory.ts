import _ from 'lodash';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import Request from '../core/api/Request';
import * as express from 'express';
import { injectable } from 'inversify';
import ReqValidationError from './ReqValidationError';

type RequestValidator = t.TypeC<any>;

function getProps(validator: any): t.Props {

  return validator.props || (validator.type ? getProps(validator.type) : {});
}

@injectable()
class ReqValidationMiddlewareFactory {

  public create(reqType: RequestValidator): express.RequestHandler {
    return (req: Request, res: express.Response, next: express.NextFunction) => {
      // Ensure no unexpected query string, URL params, or body data is
      // accepted if those sections do not have validators defined 
      const unexpectedSections = _.differenceWith(
        _.keys(_.chain(req).pick(['body', 'query', 'params']).pickBy(value => !_.isEmpty(value)).value()),
        _.keys(reqType.props),
        _.isEqual
      );

      if (!_.isEmpty(unexpectedSections)) {
        const message = 'Unexpected section: ' + unexpectedSections.join(', ');

        return next(new ReqValidationError(message));
      }

      const unexpectedProps = _.differenceWith(
        [..._.keys(req.query), ..._.keys(req.body)],
        [..._.keys(getProps(reqType.props.query || {})), ..._.keys(getProps(reqType.props.body || {}))],
        _.isEqual
      );

      if (!_.isEmpty(unexpectedProps)) {
        const message = 'Unexpected request parameters: ' + unexpectedProps.join(', ');

        return next(new ReqValidationError(message));
      }

      const result = reqType.decode(req);

      if (result.isRight()) {
        next();
      } else {
        const message = PathReporter.report(result).join(', ');

        next(new ReqValidationError(message));
      }
    };
  }

}

export default ReqValidationMiddlewareFactory;