import { injectable, inject } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import express from 'express';
import Request from '../core/api/Request';
import { PuckTokenService } from '../core/service';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import UnauthorizedError from '../core/api/error/UnauthorizedError';

@injectable()
class PuckAuthMiddleware extends BaseMiddleware {
  @inject('PuckTokenService') private puckTokenService: PuckTokenService;

  public async handler(req: Request, res: express.Response, next: express.NextFunction): Promise<void> {
    const token = req.get('Authorization');

    if (token) {
      pipe(
        await this.puckTokenService.verifyToken(token),
        E.fold(
          () => {
            next(new UnauthorizedError('Missing or invalid access token.'));
          },
          tokenMetadata => {
            req.token = {
              ...tokenMetadata,
              isAdmin: () => false,
              isService: () => false,
            };

            next();
          }
        )
      );
    } else {
      next(new UnauthorizedError('Missing or invalid access token.'));
    }
  }
}

export { PuckAuthMiddleware };