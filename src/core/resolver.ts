import _ from 'lodash';
import { injectable } from 'inversify';

export type PropertyResolverFn<T, R> = ((model: T, shouldExpand?: boolean) => Promise<R | null>);
export type PropertyResolverMap<T> = {
  [P in keyof T]?: PropertyResolverFn<T, T[P]>
};

export const EXPAND_ALL = '_all';

@injectable()
class Resolver<T extends {}> {
  protected propertyResolverMap: PropertyResolverMap<T>


  protected async resolveProps<K extends keyof T>(model: T, expandProps?: string[]) : Promise<Partial<T>> {
    const shouldExpandAll = expandProps !== undefined && _.includes(expandProps, EXPAND_ALL);
    const resolvedProps = await Promise.all(
      _.map(model, async (value: any, key: K) => {
        return this.resolveProp(model, key, expandProps === undefined ? false : shouldExpandAll || _.includes(expandProps, key as string));
      })
    );

    return Object.assign({}, ...resolvedProps);
  }

  protected async resolveProp<K extends keyof T>(model: T, prop: K, shouldExpand: boolean = false): Promise<{ [prop: string]: T[K] }> {
    const propResolver: PropertyResolverFn<T, T[K]> | undefined = this.propertyResolverMap[prop];

    if (propResolver === undefined) {
      return {};
    }

    const resolvedValue: T[K] | null = await propResolver(model, shouldExpand);

    return resolvedValue === null ? {} : { [prop as K]: resolvedValue };
  }
};

export { Resolver };
export * from './device/DeviceResolver';
export * from './location/LocationResolver';
export * from './user/UserResolver';
export * from './account/AccountResolver';
