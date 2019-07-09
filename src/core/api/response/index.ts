import { Expandable } from '../index';

export * from './Subscription';
export * from './Device';
export * from './Lookup';
export * from './Location';
export * from './User';
export * from './Account';

export abstract class Response {
  public static fromModel: <T>(model: Expandable<T>) => any;
}