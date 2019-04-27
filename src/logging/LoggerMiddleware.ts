import { injectable } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Logger from 'bunyan';
import Request from '../core/api/Request';

@injectable()
class LoggerMiddleware extends BaseMiddleware {

  public handler(req: Request, res: express.Response, next: express.NextFunction): void {
    try {
      const logger: Logger | undefined = req.log;

      if (logger) {
        this.bind<Logger>('Logger').toConstantValue(logger).whenTargetIsDefault();
      }

      next();
    } catch (err) {
      next(err);
    }
  }
}

export default LoggerMiddleware;