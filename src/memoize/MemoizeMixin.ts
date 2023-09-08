import Dataloader from 'dataloader';
import { inject, injectable } from 'inversify';
import * as uuid from 'uuid';
import 'reflect-metadata';

export type Loaders = Map<any, Dataloader<any, any>>;

export type ExtractKey = (...args: any[]) => any;

type Fn = (...args: any[]) => any;

function saveUnmemoizedMethod(prototype: any, methodName: string | symbol, method: (...args: any[]) => any): void {
  const unmemoizedMethods: Map<string | symbol, any> = Reflect.getMetadata('unmemoized', prototype) || new Map();

  if (unmemoizedMethods.get(methodName)) {
    throw new Error(`Method ${ String(methodName) } already has memoized decorator`);
  }

  unmemoizedMethods.set(methodName, method);

  Reflect.defineMetadata('unmemoized', unmemoizedMethods, prototype);
}

function getUnmemoizedMethod(prototype: any, methodName: string | symbol): undefined | Fn {
   const unmemoizedMethods: Map<string | symbol, any> | undefined = Reflect.getMetadata('unmemoized', prototype);
   
   return unmemoizedMethods && unmemoizedMethods.get(methodName);
}

function DataloaderFactory(self: any, method: (...args: any[]) => any): Dataloader<any, any> {
  return new Dataloader(async keys => Promise.all(keys.map(async key => method.call(self, key))));
}

export function memoized(extractKey?: ExtractKey): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;

    saveUnmemoizedMethod(target, propertyName, method);

    propertyDescriptor.value = async function(...args: any[]): Promise<any> {
      const self = this as any;

      const loader = self.ensureMethodLoader(propertyName);

      if (loader) {
        const key = extractKey ? extractKey(args) : args[0];

        return loader.load(key);
      } else {
        throw new Error(String(propertyName));
        return method.apply(self, args);
      }
      
    };
  };
}

type Newable<T = {}> = new(...args: any[]) => T;

// Implicit return type needed here to preserve the added props and methods of the
// derived class
// tslint:disable:max-classes-per-file typedef
export function MemoizeMixin<C extends Newable>(baseClass: C) {
  if ((baseClass as any).hasMemoizeMixin) {
    throw new Error(`Class ${ baseClass.name } is already memoized`);
  }

  @injectable()
  class MemoizedClass extends baseClass {
    public static hasMemoizeMixin: boolean = true;

    @inject('Loaders') protected loaders: Loaders;
    protected memoizedClassName: string = this.constructor.name || uuid.v4();

    protected getMethodLoader(methodName: string): Dataloader<any, any> | undefined {
      return this.loaders.get((this as any)[methodName]);
    }

    protected ensureMethodLoader(methodName: string): Dataloader<any, any> | undefined {
      const loader = this.getMethodLoader(methodName);

      if (loader) {
        return loader;
      }

      const method = getUnmemoizedMethod(this.constructor.prototype, methodName);
      
      if (method) {
        const newLoader = DataloaderFactory(this, method);

        this.loaders.set((this as any)[methodName], newLoader);

        return newLoader;
      } else {
        return undefined;
      }
    }

    protected primeMethodLoader(methodName: string, key: any, result: any): void {
      const loader = this.ensureMethodLoader(methodName);

      if (loader) {
        loader.prime(key, result);
      }
    }

    protected clearMethodLoader(methodName: string, key: any): void {
      const loader = this.ensureMethodLoader(methodName);

      if (loader) {
        loader.clear(key);
      }
    }
  }

  return MemoizedClass;
}