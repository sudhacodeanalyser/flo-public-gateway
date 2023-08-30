import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { TokenMetadata, OAuth2TokenCodec, LegacyAuthTokenCodec } from './Token';
import crypto from 'crypto';
import Logger from 'bunyan';
import moment from 'moment';

type Params = { [param: string]: any };

@injectable()
class AuthCache {
  constructor(
    @inject('RedisClient') private redisClient: Redis
  ) {}

  public async writeToCache(tokenMetadata: TokenMetadata, methodId: string, token: string, params?: Params): Promise<void> {
    const indexKey = this.formatIndexKey(token);
    const methodKey = indexKey && this.formatMethodKey(methodId, token, params);
    const tokenHash = this.hashToken(token);

    if (indexKey !== null && methodKey !== null) {
      await Promise.all([
        (async () => {
          await this.redisClient.sadd(indexKey, methodKey);
          await this.redisClient.expire(indexKey, 3600);
        })(),
       this.redisClient.setex(methodKey, 3600, JSON.stringify({ ...tokenMetadata, _token_hash: tokenHash }))
      ]);
    }
  }

  public async checkCache(methodId: string, token: string, params?: Params, logger?: Logger): Promise<Option.Option<TokenMetadata>> {
    try {
      const cacheKey = this.formatMethodKey(methodId, token, params);
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

  public async dropCache(token: string): Promise<void> {
    const now = new Date();
    const lastHourIndex = this.formatIndexKey(token, moment(now).subtract(1, 'hours').toDate());
    const currentHourIndex = this.formatIndexKey(token, now);

    if (lastHourIndex && currentHourIndex) {
      const methodKeys = await this.redisClient.sunion(lastHourIndex, currentHourIndex);

      await this.redisClient.del(lastHourIndex, currentHourIndex, ...methodKeys);
    }
  }

  private formatTokenKey(token: string): string | null {
    const tokenData = jwt.decode(_.last(token.split('Bearer ')) || '');
    const key = pipe(
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

    return key && `{${ key }}`;
  }

  private formatMethodKey(methodId: string, token: string, params?: Params): string | null {
    const cacheKeyPrefix = this.formatTokenKey(token);
    const formattedParams = !params ?
      [] :
      _.chain(params)
        .map((value, key) => `${ key }_${ _.isString(value) ? value : JSON.stringify(value) }`)
        .sortBy()
        .value();

    return cacheKeyPrefix && [cacheKeyPrefix, methodId, ...formattedParams].join(':');
  }

  private formatIndexKey(token: string, date: Date = new Date()): string | null {
    const prefix = this.formatTokenKey(token);
    const suffix = moment(date).format('YYYY-MM-DDTHH:00');

    return `${ prefix }_${ suffix }`;
  }

  private hashToken(token:string): string {
    return crypto.createHash('sha1').update(token).digest('base64');
  }
}

export { AuthCache };