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
export * from './model/Sensor';
export * from './model/AlertFeedbackFlow';
export * from './model/AlertFeedback';
export * from './model/FloDetect';
export * from './model/Telemetry';
export * from './model/Event';

// Utils
export type DependencyFactoryFactory = <T>(dep: string) => () => T;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface PropSelect {
  [prop: string]: PropExpand | true;
}

interface PropSelectOptions {
  '$rest'?: true;
  '$expandAll'?: true;
}

export type PropSelectRestIntersection = PropSelect & PropSelectOptions;

export interface PropExpand {
  '$expand'?: boolean;
  '$select'?: true | PropSelectRestIntersection
}
