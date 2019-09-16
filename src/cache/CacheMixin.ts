import { inject, injectable } from 'inversify';
import Redis from 'ioredis';
import { CachePolicy } from './CacheMiddleware';

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

export function cached(entityType: string): MethodDecorator {
 
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;

    propertyDescriptor.value = async function (...args: any[]): Promise<any> {
      const key = formatCacheKey(entityType, target, propertyName, args);
      const redisClient: Redis.Redis = (this as any).redisClient;
      const cachePolicy: CachePolicy = (this as any).cachePolicy;
      const cacheResult = cachePolicy === CachePolicy.WRITE_ONLY || cachePolicy === CachePolicy.OFF ?
        null :
        await redisClient.get(key);

      if (cacheResult != null || cacheResult === CachePolicy.READ_ONLY) {
        return cacheResult && JSON.parse(cacheResult);
      }

      const result = await method.apply(this, args);

      if (result && (cachePolicy === CachePolicy.WRITE_ONLY || CachePolicy.READ_WRITE)) {
        // Don't wait on cache write
        redisClient.set(key, JSON.stringify(result));
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
      const redisClient: Redis.Redis = (this as any).redisClient;

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
      const redisClient: Redis.Redis = (this as any).redisClient;
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
  return (target: any, propertyName: string | symbol, parameterIndex: number): void => {
    const existingCacheKeys = {
      ...Reflect.getOwnMetadata('cacheKey', target, propertyName),
      [parameterIndex]: extractKey || ((arg: any) => JSON.stringify(arg))
    };

    Reflect.defineMetadata('cacheKey', existingCacheKeys, target, propertyName);
  };
}

type Newable<T = {}> = new(...args: any[]) => T;

// Implicit return type needed here to preserve the added props and methods of the
// derived class
// tslint:disable:max-classes-per-file typedef
export function CacheMixin<C extends Newable>(baseClass: C) {
  @injectable()
  class CachedClass extends baseClass {
    @inject('RedisClient') protected redisClient: Redis.Redis;
    @inject('CachePolicy') protected cachePolicy: CachePolicy;
  }

  return CachedClass;
}

