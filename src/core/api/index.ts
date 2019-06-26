// Mixin Interfaces
export * from './Expandable';
// Models
export * from './model/Account';
export * from './model/Device';
export * from './model/Location';
export * from './model/Lookup';
export * from './model/OnboardingLog';
export * from './model/Subscription';
export * from './model/User';
export * from './SubscriptionProvider';
export * from './Timestamped';

// Utils
export type DependencyFactoryFactory = <T>(dep: string) => () => T;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
