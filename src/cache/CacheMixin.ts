import { inject, injectable } from 'inversify';
import Redis from 'ioredis';
import { CachePolicy } from './CacheMiddleware';
import * as _ from 'lodash';

function formatCacheKey(entityType: string, target: any, propertyName: string | symbol, args: any[]): string {
    const cacheKeyExtractors = Reflect.getOwnMetadata('cacheKey', target, propertyName);
    const cacheKeyIds = !cacheKeyExtractors ?
        JSON.stringify(args[0]) :
        args
          .map((arg, i) => cacheKeyExtractors[i] && cacheKeyExtractors[i](arg))
          .filter(keyId => keyId)
          .join('_');

    return `${ entityType }_${ cacheKeyIds }`;
}

export function cached(entityType: string, ttl?: number): MethodDecorator {
 
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;

    propertyDescriptor.value = async function (...args: any[]): Promise<any> {
      const key = formatCacheKey(entityType, target, propertyName, args);
      const redisClient: Redis = (this as any).redisClient;
      const cachePolicy: CachePolicy = (this as any).cachePolicy;
      const cacheResult = cachePolicy === CachePolicy.WRITE_ONLY || cachePolicy === CachePolicy.OFF ?
        null :
        await redisClient.get(key);

      if (cacheResult != null || cachePolicy === CachePolicy.READ_ONLY) {
        return cacheResult && JSON.parse(cacheResult);
      }

      const result = await method.apply(this, args);

      if (result && (cachePolicy === CachePolicy.WRITE_ONLY || cachePolicy === CachePolicy.READ_WRITE)) {
        // Don't wait on cache write
        if (ttl) {
          redisClient.setex(key, ttl, JSON.stringify(result));
        } else {
          redisClient.set(key, JSON.stringify(result));
        }
      }

      return result;
    };
  };

}

export function dropCache(entityType: string): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;
    
    propertyDescriptor.value = async function (...args: any[]): Promise<any> {
      const key = formatCacheKey(entityType, target, propertyName, args);
      const redisClient: Redis = (this as any).redisClient;

      await method.apply(this, args);

      // Don't wait on cache write
      redisClient.del(key);
    };
  };
}

export function updateCache(entityType: string): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;
    
    propertyDescriptor.value = async function (...args: any[]): Promise<any> {
      const key = formatCacheKey(entityType, target, propertyName, args);
      const redisClient: Redis = (this as any).redisClient;
      const result = await method.apply(this, args);

      if (result) {
        // Don't wait on cache write
        redisClient.set(key, JSON.stringify(result));
      } 

      return result;
    };
  };
}

export function cacheKey(extractKey?: (arg: any) => string): ParameterDecorator {
  return (target: object, propertyName: string | symbol | undefined, parameterIndex: number): void => {
    const name = propertyName || '';
    const existingCacheKeys = {
      ...Reflect.getOwnMetadata('cacheKey', target, name),
      [parameterIndex]: extractKey || ((arg: any) => _.isString(arg) ? arg : JSON.stringify(arg))
    };

    Reflect.defineMetadata('cacheKey', existingCacheKeys, target, name);
  };
}

type Newable<T = {}> = new(...args: any[]) => T;

// Implicit return type needed here to preserve the added props and methods of the
// derived class
// tslint:disable:max-classes-per-file typedef
export function CacheMixin<C extends Newable>(baseClass: C) {
  @injectable()
  class CachedClass extends baseClass {
    @inject('RedisClient') protected redisClient: Redis;
    @inject('CachePolicy') protected cachePolicy: CachePolicy;

    protected async cache(data: any, entityType: string, key: string, ttl?: number): Promise<void> {
      const k = `${ entityType }_${ key }`;

      if (ttl) {
        await this.redisClient.setex(k, ttl, JSON.stringify(data));
      } else {
        await this.redisClient.set(k, JSON.stringify(data));
      }
    }
  }

  return CachedClass;
}

