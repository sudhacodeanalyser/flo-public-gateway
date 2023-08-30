import * as _ from 'lodash';
import { inject, injectable } from 'inversify';
import Redis from 'ioredis';

@injectable()
export default class ConcurrencyService {

  constructor(
    @inject('RedisClient') private redisClient: Redis
  ) {}

  public async acquireLock(key: string, ttlSecs: number): Promise<boolean> {
    // Lock algorithm described here: https://redis.io/commands/set
    const hasLock = await this.redisClient.set(key, new Date().getTime() + ttlSecs  * 1000, 'EX', ttlSecs, 'NX');
    return !_.isNil(hasLock);
  }

  public async releaseLock(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
