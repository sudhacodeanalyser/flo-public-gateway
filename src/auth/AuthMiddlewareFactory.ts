import { AxiosInstance } from 'axios';
import express from 'express';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import Request from '../core/api/Request';
import ForbiddenError from './ForbiddenError';
import UnauthorizedError from './UnauthorizedError';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { TokenMetadata, OAuth2TokenCodec, LegacyAuthTokenCodec } from './Token';
import Logger from 'bunyan';
import crypto from 'crypto';
import config from '../config/config';
import { DependencyFactoryFactory } from '../core/api';

type Params = { [param: string]: any };
type GetParams = (req: Request, depFactoryFactory: DependencyFactoryFactory) => Promise<Params>;


@injectable()
class AuthMiddlewareFactory {
  @inject('AuthUrl') private authUrl: string;
  @inject('RedisClient') private redisClient: Redis.Redis;
  @inject('HttpClient') private httpClient: AxiosInstance;
  @inject('DependencyFactoryFactory') private depFactoryFactory: DependencyFactoryFactory;

  public create(getParams?: GetParams, overrideMethodId?: string): express.Handler {
    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      try {
        const token = req.get('Authorization');

        if (_.isEmpty(token) || token === undefined) {
          return next(new UnauthorizedError('Missing or invalid access token.'));
        }

        const logger = req.log;
        const path = overrideMethodId || req.route.path.split('/').map((p: string) => p.replace(/:.+/g, '$')).join('/');
        const methodId = req.method + path;
        const params = getParams && (await getParams(req, this.depFactoryFactory));
        const tokenMetadata = await pipe(
          await this.checkCache(methodId, token, params, logger),
          Option.fold(
            () => async () => this.callAuthService(methodId, token, params),
            tokenMedata => TaskEither.right(tokenMedata)
          ),
          TaskEither.getOrElse((err): TokenMetadata => async () => next(err))
        )();


        if (logger !== undefined) {
          logger.info({ token: tokenMetadata });
        } 

        req.token = tokenMetadata;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  private formatCacheKey(methodId: string, token: string, params?: Params): string | null {
    const tokenData = jwt.decode(_.last(token.split('Bearer ')) || '');
    const cacheKeyPrefix = pipe(
      LegacyAuthTokenCodec.decode(tokenData),
      Either.fold(
        () => pipe(
          OAuth2TokenCodec.decode(tokenData),
          Either.map(({ jti }) => jti)
        ),
        ({ user: { user_id }, iat }) => Either.right(`${ user_id }_${ iat }`)
      ),
      Either.getOrElse((): string | null => null)
    );
    const formattedParams = !params ?
      [] :
      _.chain(params)
        .map((value, key) => `${ key }_${ _.isString(value) ? value : JSON.stringify(value) }`)
        .sortBy()
        .value();

    return cacheKeyPrefix && [cacheKeyPrefix, methodId, ...formattedParams].join(':');
  }

  private async checkCache(methodId: string, token: string, params?: Params, logger?: Logger): Promise<Option.Option<TokenMetadata>> {
    try {
      const cacheKey = this.formatCacheKey(methodId, token, params);
      const cacheResult = cacheKey && (await this.redisClient.get(cacheKey));

      if (cacheResult == null) {
        return Option.none;
      } else {
        const tokenMetadata = JSON.parse(cacheResult);

        if (!tokenMetadata._token_hash || tokenMetadata._token_hash !== this.hashToken(token)) {
          return Option.none;
        }
        
        return Option.some(tokenMetadata);
      }
    } catch (err) {
      
      if (logger) {
        logger.error({ err });
      }

      return Option.none;
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
          this.writeToCache(authResponse.data, methodId, token, params);

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

  private hashToken(token:string): string {
    return crypto.createHash('sha1').update(token).digest('base64');
  }

  private async writeToCache(tokenMetadata: TokenMetadata, methodId: string, token: string, params?: Params): Promise<void> {
    const cacheKey = this.formatCacheKey(methodId, token, params);
    const tokenHash = this.hashToken(token);

    if (cacheKey !== null) {
      // TTL 1 hour, this means that a token can live max 1 hour after its true expiration in the cache
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify({ ...tokenMetadata, _token_hash: tokenHash }));
    }
  }
}
export default AuthMiddlewareFactory;