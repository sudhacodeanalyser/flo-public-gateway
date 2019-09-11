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

type GetParams = (req: Request) => Promise<{ [param: string]: any }>;


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
      const tokenMetadata = pipe(
        await this.checkCache(req, methodId, token, getParams),
        Option.fold(
          () => async () => this.callAuthService(req, methodId, token, getParams),
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

  private async formatCacheKey(req: Request, methodId: string, token: string, getParams?: GetParams): Promise<string | null> {
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
    const formattedParams = !getParams ?
      [] :
      _.chain(await getParams(req))
        .map((value, key) => `${ key }_${ value }`)
        .sortBy()
        .value();

    return cacheKeyPrefix && [cacheKeyPrefix, methodId, ...formattedParams].join(':');
  }

  private async checkCache(req: Request, methodId: string, token: string, getParams?: GetParams): Promise<Option.Option<TokenMetadata>> {
    const cacheKey = await this.formatCacheKey(req, methodId, token, getParams);
    const cacheResult = cacheKey && (await this.redisClient.get(cacheKey));
    
    if (cacheResult == null) {
      return Option.none;
    } else {
      return Option.some(JSON.parse(cacheResult));
    }
  }

  private async callAuthService(req: Request, methodId: string, token: string, getParams?: GetParams): Promise<Either.Either<Error, TokenMetadata>> {
      try {
        const params = getParams !== undefined ? (await getParams(req)) : undefined;
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
          this.writeToCache(authResponse.data, req, methodId, token, getParams);

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

  private async writeToCache(tokenMetadata: TokenMetadata, req: Request, methodId: string, token: string, getParams?: GetParams): Promise<void> {
    const cacheKey = await this.formatCacheKey(req, methodId, token, getParams);

    if (cacheKey !== null) {
      // TTL 1 hour, this means that a token can live max 1 hour after it's true expiration in the cache
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(tokenMetadata));
    }
  }
}
export default AuthMiddlewareFactory;