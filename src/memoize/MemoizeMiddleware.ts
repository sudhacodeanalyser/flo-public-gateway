import { injectable, inject } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Request from '../core/api/Request';
import { Loaders } from './MemoizeMixin';

@injectable()
class MemoizeMiddleware extends BaseMiddleware {

  public handler(req: Request, res: express.Response, next: express.NextFunction): void {

    this.bind<Loaders>('Loaders').toConstantValue(new Map());

    next();
  }
}

export default MemoizeMiddleware;
