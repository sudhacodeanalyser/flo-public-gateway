import * as t from 'io-ts';

// Mixin Interfaces
export * from './Expandable';
export * from './Timestamped';
export * from './SubscriptionProvider';

// Models
export * from './model/Account';
export * from './model/User';
export * from './model/Location';
export * from './model/Device';
export * from './model/Subscription';

// Utils
export type DependencyFactoryFactory = <T>(dep: string) => () => T;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export enum NoYesUnsure {
  NO = 0,
  YES,
  UNSURE
}

export const NoYesUnsureCodec = t.union([
  t.literal(0),
  t.literal(1),
  t.literal(2)
]);