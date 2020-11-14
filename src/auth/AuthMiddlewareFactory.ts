import { AxiosInstance } from 'axios';
import express from 'express';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Request from '../core/api/Request';
import ForbiddenError from './ForbiddenError';
import UnauthorizedError from './UnauthorizedError';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { TokenMetadata } from './Token';
import jwt from 'jsonwebtoken';
import Logger from 'bunyan';
import config from '../config/config';
import { DependencyFactoryFactory } from '../core/api';
import { AuthCache } from './AuthCache';

type Params = { [param: string]: any };
type GetParams = (req: Request, depFactoryFactory: DependencyFactoryFactory) => Promise<Params | Params[]>;


@injectable()
class AuthMiddlewareFactory {
  @inject('AuthUrl') private authUrl: string;
  @inject('InternalFloMoenAuthUrl') private internalFloMoenAuthUrl: string;
  @inject('AuthCache') private authCache: AuthCache;
  @inject('HttpClient') private httpClient: AxiosInstance;
  @inject('DependencyFactoryFactory') private depFactoryFactory: DependencyFactoryFactory;

  public create(getParams?: GetParams, overrideMethodId?: string): express.Handler {
    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      try {
        let authHeader = req.get('Authorization');
        if (_.isEmpty(authHeader) || authHeader === undefined) {
          return next(new UnauthorizedError('Missing or invalid access token.'));
        }

        const logger = req.log;
        if (this.requireExchange(authHeader, logger)) {
          const tradeRes = await this.tradeToken(authHeader, logger)
          if (tradeRes instanceof Error) {
            throw tradeRes as Error;
          } else {
            authHeader = tradeRes as string; // swap auth header
          }
        }

        const token = authHeader; // seal the value to preserve original logic
        const path = overrideMethodId || req.route.path.split('/').map((p: string) => p.replace(/:.+/g, '$')).join('/');
        const methodId = req.method + path;
        const rawParams = getParams && (await getParams(req, this.depFactoryFactory));
        const paramArray = rawParams && (_.isArray(rawParams) ? rawParams : [rawParams]);

        const results = await Promise.all((!paramArray || _.isEmpty(paramArray) ? [{}] : paramArray)
          .map(async params => {
            return pipe(
              await this.authCache.checkCache(methodId, token, params, logger),
              Option.fold(
                () => async () => this.callAuthService(methodId, token, _.isEmpty(params) ? undefined : params),
                tokenMedata => TaskEither.right(tokenMedata)
              )
            )();

          }));

        const leftResult = _.find(results, result => Either.isLeft(result)) as Either.Left<Error> | undefined;

        if (leftResult) {
          throw leftResult.left;
        } 

        const tokenMetadata = (_.find(results, result => Either.isRight(result)) as Either.Right<TokenMetadata> | undefined)?.right;

        if (logger !== undefined) {
          logger.info({ token: tokenMetadata });
        }

        req.token = {
          ...tokenMetadata,
          isAdmin(): boolean {
            return !!this.roles && this.roles.indexOf('system.admin') >= 0;
          }
        };

        next();
      } catch (err) {
        next(err);
      }
    };
  }

  // check to see if issuer is aws cognito
  private requireExchange(token:string,logger:Logger|undefined):boolean {
    const tokenData:any = jwt.decode(_.last(token.split('Bearer ')) || '');
    const iss:string = tokenData.iss || '';
    if(/^https:\/\/cognito-.+\.amazonaw\.com/gi.test(iss)) {
      logger?.debug({ tokenExchange:tokenData })
      return true;
    }
    return false;
  }

  private async tradeToken(token:string,logger:Logger|undefined): Promise<Error | string> {
    try {
      const authResponse = await this.httpClient.request({
        method: 'get',
        url: this.internalFloMoenAuthUrl,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        timeout: config.authTimeoutMS
      });

      if (authResponse.status === 200) {
        const tk:string = authResponse.data && authResponse.data.token || '';
        if(tk === '') {
          logger?.error({ tokenExchange:authResponse.data })
          return new Error('Token exchange decode failed.');
        }
        logger?.trace({ tokenExchange:"OK!" })
        return tk; // OK!
      } else {
        logger?.warn({ tokenExchange:authResponse.data })
        return new Error('Unknown exchange response.');
      }
    } catch (err) {
      if(err) {
        const authResponse = err.response;

        logger?.info({ tokenExchange:err.response.data })
        if (authResponse && (authResponse.status === 400 || authResponse.status === 401)) {
          return new UnauthorizedError(authResponse.data.message);
        } else if (authResponse && authResponse.status === 403) {
          return new ForbiddenError(authResponse.data.message);
        }
      }
      return err;
    }
  }

  private async callAuthService(methodId: string, token: string, params?: Params): Promise<Either.Either<Error, TokenMetadata>> {
      try {
        const authResponse = await this.httpClient.request({
          method: 'post',
          url: this.authUrl,
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          data: {
            method_id: methodId,
            params
          },
          timeout: config.authTimeoutMS
        });

        if (authResponse.status === 200) {
          // Do not block on cache write
          this.authCache.writeToCache(authResponse.data, methodId, token, params);

          return Either.right(authResponse.data);
        } else {
          return Either.left(new Error('Unknown response.'));
        }
      } catch (err) {
        const authResponse = err.response;

        if (authResponse && (authResponse.status === 400 || authResponse.status === 401)) {
          return Either.left(new UnauthorizedError(authResponse.data.message));
        } else if (authResponse && authResponse.status === 403) {
          return Either.left(new ForbiddenError(authResponse.data.message));
        } else {
          return Either.left(err);
        }
      }   
  }

}
export default AuthMiddlewareFactory;