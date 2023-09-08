import { AxiosInstance } from 'axios';
import express from 'express';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import Request from '../core/api/Request';
import ForbiddenError from './ForbiddenError';
import UnauthorizedError from './UnauthorizedError';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { TokenMetadata } from './Token';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { DependencyFactoryFactory } from '../core/api';
import { AuthCache } from './AuthCache';
import ValidationError from '../core/api/error/ValidationError';
import ConflictError from '../core/api/error/ConflictError';

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
        const logger = req.log;
        let authHeader:string = req.get('Authorization') ?? '';
        if (_.isEmpty(authHeader)) {
          return next(new UnauthorizedError('Missing or invalid access token.'));
        }
        if (this.requireExchange(authHeader)) { // attempt token exchange if enabled and required
          authHeader = await this.tradeToken(authHeader)
          req.headers.authorization = authHeader
          logger?.debug({ tokenExchange: 'OK' });
        }

        const token = authHeader; // seal the value to preserve original logic
        const path = overrideMethodId || req.route.path.split('/').map((p: string) => p.replace(/:.+/g, '$')).join('/');
        const methodId = req.method + path;
        const rawParams = getParams && (await getParams(req, this.depFactoryFactory));
        const paramArray = rawParams && (_.isArray(rawParams) ? rawParams : [rawParams]);
        const noCache = /^(off|0|no|false)$/i.test(req.query?.cache?.toString() || '');
        const results = await Promise.all((!paramArray || _.isEmpty(paramArray) ? [{}] : paramArray)
          .map(async params => {
            return pipe(
              noCache ? Option.none : await this.authCache.checkCache(methodId, token, params, logger),
              Option.fold(
                () => async () => this.callAuthService(methodId, token, _.isEmpty(params) ? undefined : params),
                tokenMedata => TaskEither.right(tokenMedata)
              )
            )();

          }));

        const leftResult = _.find(results, result => Either.isLeft(result)) as Either.Left<Error> | undefined;
        if (leftResult) {
          return next(leftResult.left);
        } 

        const tokenMetadata = (_.find(results, result => Either.isRight(result)) as Either.Right<TokenMetadata> | undefined)?.right;
        if (logger !== undefined) {
          logger.info({ token: tokenMetadata });
        }

        req.token = {
          ...tokenMetadata,
          isAdmin(): boolean {
            return !!this.roles && this.roles.indexOf('system.admin') >= 0;
          },
          isService(): boolean {
            return this.roles?.indexOf('app.flo-internal-service') >= 0;
          }
        };
        return next();
      } catch (err) {
        return next(err);
      }
    };
  }

  // check to see if issuer is aws cognito
  private requireExchange(token: string): boolean {
    if (!this.internalFloMoenAuthUrl || !/^http/i.test(this.internalFloMoenAuthUrl)) {
      return false;
    }
    const tokenData: any = jwt.decode(_.last(token.split('Bearer ')) || '');
    const iss: string = tokenData?.iss ?? '';
    return iss !== '' && /^https:\/\/cognito-.+\.amazonaws\.com/i.test(iss)
  }

  private async tradeTokenReq(token: string): Promise<any> {
    try {
      return await this.httpClient.request({
        method: 'GET',
        url: this.internalFloMoenAuthUrl + '/token/trade',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        timeout: config.authTimeoutMS
      });
    } catch (err: any) {
      if (err?.response) {
        const authResponse = err.response;
        switch (authResponse?.status ?? 0) {
          case 400:
            throw(new ValidationError(authResponse.data?.message ?? 'Token Exchange Validation Failed'));
          case 401:
            throw(new UnauthorizedError(authResponse.data?.message ?? 'Token Exchange Unauthorized'));
          case 403:
            throw(new ForbiddenError(authResponse.data?.message ?? 'Token Exchange Forbidden'));
          case 409:
            throw(new ConflictError(authResponse.data?.message ?? 'Token Exchange Conflict'));
        }
      }
      throw(err); // rethrow by default.
    }
  }

  // exchange a Moen Cognito access JWT for an "impersonated" Flo access JWT
  private async tradeToken(token: string): Promise<string> {
    const authResponse = await this.tradeTokenReq(token)
    if (authResponse.status === 200) {
      const tk: string = authResponse?.data?.token;
      if (_.isEmpty(tk)) {
        throw(new Error('Token exchange decode failed.'));
      }
      return tk; // OK!
    }
    throw(new Error('Unknown exchange response.'));
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
          process.nextTick(() => this.authCache.writeToCache(authResponse.data, methodId, token, params));

          return Either.right(authResponse.data);
        } else {
          return Either.left(new Error('Unknown response.'));
        }
      } catch (err: any) {
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