import { inject, injectable } from 'inversify';
import Request from '../core/api/Request';
import express from 'express';
import axios from 'axios';
import ForbiddenError from './ForbiddenError';
import UnauthorizedError from './UnauthorizedError';

type GetParams = (req: Request) => Promise<{ [param: string]: any }>;

@injectable()
class AuthMiddlewareFactory {
  @inject('AuthUrl') private authUrl: string;

  public create(getParams?: GetParams, methodId?: string): express.Handler {
    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      try {
        const logger = req.log;
        const token = req.get('Authorization');
        const path = methodId || req.route.path.split('/').map((p: string) => p.replace(/:.+/g, '$')).join('/');
        const params = getParams !== undefined && (await getParams(req));
        const authResponse = await axios({
          method: 'post',
          url: this.authUrl,
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          data: {
            method_id: methodId || (req.method + path),
            params
          }
        });

        if (authResponse.status === 200) {
          
          if (logger !== undefined) {
            logger.info({ token: authResponse.data });
          }

          req.token = authResponse.data;
          next();
        } else {
          next(new Error('Unknown response.'));
        }
      } catch (err) {
        const authResponse = err.response;

        if (authResponse && authResponse.status === 401) {
          next(new UnauthorizedError(authResponse.data.message));
        } else if (authResponse && authResponse.status === 403) {
          next(new ForbiddenError(authResponse.data.message));
        } else {
          next(err);
        }
      }
    };
  }
}

export default AuthMiddlewareFactory;