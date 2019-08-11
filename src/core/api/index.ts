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
export * from './model/Lookup';
export * from './model/Notification';
export * from './model/Water';
export * from './model/AlertFeedbackFlow';

// Utils
export type DependencyFactoryFactory = <T>(dep: string) => () => T;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type PropExpand = Array<string | string[]>;

