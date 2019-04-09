import { inject, injectable, named } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Logger from 'bunyan';
import IRequest from '../utils/IRequest';

@injectable()
class LoggerMiddleware extends BaseMiddleware {

  public handler(req: IRequest, res: express.Response, next: express.NextFunction) {
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