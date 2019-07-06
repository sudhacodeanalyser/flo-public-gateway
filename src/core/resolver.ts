import { injectable } from 'inversify';
import _ from 'lodash';
import { PropExpand } from './api';

export type PropertyResolverFn<T, R> = ((model: T, shouldExpand?: boolean, expandProps?: PropExpand) => Promise<R | null>);
export type PropertyResolverMap<T> = {
  [P in keyof T]?: PropertyResolverFn<T, T[P]>
};

export const EXPAND_ALL = '_all';

@injectable()
class Resolver<T extends {}> {
  protected propertyResolverMap: PropertyResolverMap<T>


  protected async resolveProps<K extends keyof T>(model: T, expandProps?: PropExpand) : Promise<Partial<T>> {
    const shouldExpandAll = expandProps !== undefined && _.includes(expandProps, EXPAND_ALL);
    const resolvedProps = await Promise.all(
      _.map(model, async (value: any, key: K) => {
        const expandProp = expandProps &&
          _.find(expandProps, prop => (_.isArray(prop) ? prop[0] : prop) === key);

        return this.resolveProp(model, key, expandProp !== undefined || shouldExpandAll, _.isArray(expandProp) ? expandProp.slice(1) : undefined);
      })
    );

    return Object.assign({}, ...resolvedProps);
  }

  protected async resolveProp<K extends keyof T>(model: T, prop: K, shouldExpand: boolean = false, expandProps?: PropExpand): Promise<{ [prop: string]: T[K] }> {
    const propResolver: PropertyResolverFn<T, T[K]> | undefined = this.propertyResolverMap[prop];

    if (propResolver === undefined) {
      return {};
    }

    const resolvedValue: T[K] | null = await propResolver(model, shouldExpand, expandProps);

    return resolvedValue === null ? {} : { [prop as K]: resolvedValue };
  }
};

export * from './account/AccountResolver';
export * from './device/DeviceResolver';
export * from './location/LocationResolver';
export * from './subscription/SubscriptionResolver';
export * from './user/UserResolver';
export { Resolver };

