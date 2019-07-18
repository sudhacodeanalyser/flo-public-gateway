import Dataloader from 'dataloader';
import { inject, injectable } from 'inversify';
import uuid from 'uuid';
import 'reflect-metadata';

export type Loaders = Record<string | symbol, Dataloader<any, any>>;

export type ExtractKey = (...args: any[]) => any;

function formatLoaderURI(classURI: string, methodName: string): string {
  return `${ classURI }.${ methodName }`;
}

function DataloaderFactory(self: any, method: (...args: any[]) => any): Dataloader<any, any> {
  return new Dataloader(async keys => Promise.all(keys.map(async key => method.call(self, key))));
}

export function memoized(extractKey?: ExtractKey): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;
    const loaderURI = formatLoaderURI(target.constructor.name, String(propertyName));
    
    Reflect.defineMetadata('unmemoized', method, target, loaderURI);

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
  @injectable()
  class MemoizedClass extends baseClass {
    @inject('Loaders') protected loaders: Loaders;
    protected URI: string = this.constructor.name || uuid.v4();

    protected getMethodLoader(methodName: string): Dataloader<any, any> | undefined {
      return this.loaders[formatLoaderURI(this.URI, methodName)];
    }

    protected ensureMethodLoader(methodName: string): Dataloader<any, any> | undefined {
      const loader = this.getMethodLoader(methodName);

      if (loader) {
        return loader;
      }

      const method = Reflect.getMetadata('unmemoized', this.constructor.prototype, formatLoaderURI(this.URI, methodName));

      if (method) {
        const newLoader = DataloaderFactory(this, method);

        this.loaders[formatLoaderURI(this.URI, methodName)] = newLoader;

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
  }

  return MemoizedClass;
}