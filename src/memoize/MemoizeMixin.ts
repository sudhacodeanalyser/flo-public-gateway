import Dataloader from 'dataloader';
import { inject, injectable } from 'inversify';

export type Loaders = Record<string | symbol, Dataloader<any, any>>;

export type LoadFn = <K, T>(method: (key: K) => Promise<T>, ...args: any[]) => Promise<T>;

export function memoized<K, T>(load?: LoadFn): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;

    propertyDescriptor.value = async function(...args: any[]): Promise<T> {
      const self = this as any;

      if (!self.loaders[propertyName]) {
        self.loaders[propertyName] = new Dataloader<K, T>(
          async (keys: K[]) => keys.map(key => 
            load ? 
              load(method.bind(self), ...args) :
              method.call(self, key)
          )
        )
      }

      const key = args[0];

      return self.loaders[propertyName].load(key);
    };
  };
}

type Newable = new(...args: any[]) => any;

export function MemoizeMixin(baseClass: Newable): Newable {
  @injectable()
  class MemoizedClass extends baseClass {
    @inject('Loaders') protected loaders: Loaders;
  }

  return MemoizedClass;
}