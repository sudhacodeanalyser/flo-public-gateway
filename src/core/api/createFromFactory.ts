import { interfaces } from 'inversify';

export function createFromFactory<T>(factory: interfaces.Factory<T>): T {
  const objectOrFactory: T | ((...args: any[]) => T) = factory();

  return typeof objectOrFactory === 'function' ? objectOrFactory.call(objectOrFactory) : objectOrFactory;
}