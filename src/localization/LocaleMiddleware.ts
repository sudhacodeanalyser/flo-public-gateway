import { injectable, inject } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Request from '../core/api/Request';

@injectable()
class LocaleMiddleware extends BaseMiddleware {
  public handler(req: Request, res: express.Response, next: express.NextFunction): void {
    const locale = req.query.lang || req.query.locale;

    if (locale) {
      this.bind<string | undefined>('Locale').toConstantValue(locale.toString());
    }

    next();
  }
}

export default LocaleMiddleware;