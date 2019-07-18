import Dataloader from 'dataloader';
import { inject, injectable } from 'inversify';

export type Loaders = Record<string | symbol, Dataloader<any, any>>;

export type ExtractKey = <K>(...args: any[]) => K;
export type LoadFn = <K, T>(method: (...args: any) => Promise<T>, ...args: any[]) => Dataloader.BatchLoadFn<K, T>;

export function memoized<K, T>(extractKey?: ExtractKey, load?: LoadFn): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;

    propertyDescriptor.value = async function(...args: any[]): Promise<T> {
      const self = this as any;

      if (!self.loaders[propertyName]) {
        self.loaders[propertyName] = new Dataloader<K, T>(
          load ?
            load(method.bind(self), ...args) :
            async (keys: K[]) => keys.map(key => 
              method.call(self, keys)
            )
        );
      }

      const key = extractKey ? extractKey(args) : args[0];

      return self.loaders[propertyName].load(key);
    };
  };
}

type Newable = new(...args: any[]) => any;

// tslint:disable:max-classes-per-file
export function MemoizeMixin(baseClass: Newable = class {}): Newable {
  @injectable()
  class MemoizedClass extends baseClass {
    @inject('Loaders') protected loaders: Loaders;
  }

  return MemoizedClass;
}