import UnauthorizedError from '../core/api/error/UnauthorizedError';
import express from 'express';
import Request from '../core/api/Request';

export function authUnion(...authHandlers: express.Handler[]): express.Handler {
  return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    let isAuthorized = false; 

    for (let i = 0; i < authHandlers.length && !isAuthorized; i++) {
      const authHandler = authHandlers[i];

      isAuthorized = await (new Promise((resolve, reject) => authHandler(req, res, err => {
        if (err) {
          // TODO: Revisit this log level?
          if (req.log) {
            req.log.warn({ err });
          }

          resolve(false);
        } else {
          resolve(true);
        }
      })));
    }

    if (isAuthorized) {
      next();
    } else {
      next(new UnauthorizedError());
    }
  };
}