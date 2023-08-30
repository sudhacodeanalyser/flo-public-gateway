import { injectable } from 'inversify';
import * as _ from 'lodash';
import { PropExpand } from './api';

export type PropertyResolverFn<T, R> = ((model: T, shouldExpand?: boolean, expandProps?: PropExpand) => Promise<R | null>);
export type PropertyResolverMap<T> = {
  [P in keyof T]?: PropertyResolverFn<T, T[P]>
};

export const EXPAND_ALL = '_all';

@injectable()
class Resolver<T extends {}> {
  protected propertyResolverMap: PropertyResolverMap<T>


  protected async resolveProps<K extends keyof T>(model: T, expandProps: PropExpand = { $select: true }) : Promise<Partial<T>> {
    const shouldExpandAll = expandProps.$select && expandProps.$select !== true && expandProps.$select.$expandAll;
    const resolvedProps = await Promise.all(
      _.map(model, async (value: any, key: K) => {
        const keyString = key as string;
        const propSelect = expandProps.$select && expandProps.$select !== true ? expandProps.$select[keyString] : undefined;
        const shouldSelectProp = 
          shouldExpandAll || 
          expandProps.$select === true ||  
          (expandProps.$expand === true && !expandProps.$select) ||
          (expandProps.$select && expandProps.$select.$rest) || 
          propSelect
        const shouldExpandProp = 
          shouldExpandAll ||
          (
            propSelect && propSelect !== true && (propSelect.$expand || propSelect.$select) 
          );

        return shouldSelectProp ?
          this.resolveProp(
            model, 
            key, 
            !!shouldExpandProp,
            expandProps.$select && (
              expandProps.$select === true || 
              expandProps.$select[keyString] === true
            ) ? 
              { $select: true } :
              (expandProps.$select && expandProps.$select[keyString]) as PropExpand | undefined
          ) :
          { [key]: null };
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
export * from './flo-detect/FloDetectResolver';
export { Resolver };

