import axios from 'axios';
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

type Params = { [param: string]: any };
type GetParams = (req: Request) => Promise<Params>;


@injectable()
class AuthMiddlewareFactory {
  @inject('AuthUrl') private authUrl: string;
  @inject('RedisClient') private redisClient: Redis.Redis;

  public create(getParams?: GetParams, overrideMethodId?: string): express.Handler {
    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      const token = req.get('Authorization');

      if (_.isEmpty(token) || token === undefined) {
        return next(new UnauthorizedError('Missing or invalid access token.'));
      }

      const path = overrideMethodId || req.route.path.split('/').map((p: string) => p.replace(/:.+/g, '$')).join('/');
      const methodId = req.method + path;
      const params = getParams && (await getParams(req));
      const tokenMetadata = await pipe(
        await this.checkCache(methodId, token, params),
        Option.fold(
          () => async () => this.callAuthService(methodId, token, params),
          tokenMedata => TaskEither.right(tokenMedata)
        ),
        TaskEither.getOrElse((err): TokenMetadata => async () => next(err))
      )();

      const logger = req.log;

      if (logger !== undefined) {
        logger.info({ token: tokenMetadata });
      } 

      req.token = tokenMetadata;
      next();
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
        .map((value, key) => `${ key }_${ value }`)
        .sortBy()
        .value();

    return cacheKeyPrefix && [cacheKeyPrefix, methodId, ...formattedParams].join(':');
  }

  private async checkCache(methodId: string, token: string, params?: Params): Promise<Option.Option<TokenMetadata>> {
    const cacheKey = this.formatCacheKey(methodId, token, params);
    const cacheResult = cacheKey && (await this.redisClient.get(cacheKey));

    if (cacheResult == null) {
      return Option.none;
    } else {
      return Option.some(JSON.parse(cacheResult));
    }
  }

  private async callAuthService(methodId: string, token: string, params?: Params): Promise<Either.Either<Error, TokenMetadata>> {
      try {
        const authResponse = await axios({
          method: 'post',
          url: this.authUrl,
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          data: {
            method_id: methodId,
            params
          }
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

  private async writeToCache(tokenMetadata: TokenMetadata, methodId: string, token: string, params?: Params): Promise<void> {
    const cacheKey = this.formatCacheKey(methodId, token, params);

    if (cacheKey !== null) {
      // TTL 1 hour, this means that a token can live max 1 hour after it's true expiration in the cache
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(tokenMetadata));
    }
  }
}
export default AuthMiddlewareFactory;