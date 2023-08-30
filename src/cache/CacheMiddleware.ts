import { injectable, inject } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Request from '../core/api/Request';

export enum CachePolicy {
  READ_WRITE = 'readwrite',
  READ_ONLY = 'readonly',
  WRITE_ONLY = 'writeonly',
  OFF = 'off'
}

@injectable()
class CacheMiddleware extends BaseMiddleware {

  public handler(req: Request, res: express.Response, next: express.NextFunction): void {
    const cachePolicy = this.parseCachePolicy(req.query.cachePolicy?.toString() || '');

    // Delete property to avoid conflict with validation
    delete req.query.cachePolicy;

    this.bind<CachePolicy>('CachePolicy').toConstantValue(cachePolicy);

    next();
  }

  private parseCachePolicy(cachePolicy: string): CachePolicy {
    switch (cachePolicy.toLowerCase()) {
      case 'no':
      case 'off':
      case '0':
      case 'false':
        return CachePolicy.OFF;
      case 'write':
      case 'writeonly': 
        return CachePolicy.WRITE_ONLY;
      case 'read':
      case 'readonly':
        return CachePolicy.READ_ONLY;
      case 'yes':
      case 'on':
      case 'true':
      case '1':
      case 'readwrite':
      default:
        return CachePolicy.READ_WRITE;
    }
  }
}

export default CacheMiddleware;
