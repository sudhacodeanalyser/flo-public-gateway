import * as _ from 'lodash';
import { controller, interfaces, HttpResponseMessage, JsonContent, requestHeaders, queryParam, httpMethod as inversifyHttpMethod, HTTP_VERBS_ENUM } from 'inversify-express-utils';
import ResourceDoesNotExistError from './error/ResourceDoesNotExistError';
import NotFoundError from './error/NotFoundError';
import ValidationError from './error/ValidationError';
import { PropExpand, Expandable, PropSelectRestIntersection } from './index';
import { Response } from './response';
import { Option, isNone } from 'fp-ts/lib/Option';
import express from 'express';

export function parseExpand(expand?: string, fields?: string): PropExpand {
  
  if (!expand && !fields) {
    return { $select: true }
  } else if (expand && expand.includes('_all')) {
    return {
      $select: {
        $expandAll: true
      }
    };
  }

  return {
    $select: _parseExpand(expand, fields)
  };
}

/*
 * Strips any property with a null value.
 * @description Use this if you are trying to pair down an object that has been 
 * filtered using the resolver.resolveProps since the resolver leaves null 
 * properties on the returned object. At some point the resolver method 
 * could set `[key]: undefined` to eliminate this issue, but at this point 
 * some clients may rely on the null valued properties being included. 
 */
export function stripNulls<T extends object>(input: T | null, defaultValue: T) : T {
  try {
    if (input === null || typeof input !== 'object') {
      return defaultValue;
    }
    const inputAsString = JSON.stringify(input, (k, v) => {
      return v === null ? undefined : v;
    });
    return JSON.parse(inputAsString) as T || defaultValue;
  } catch (error) {
    return defaultValue;
  }
}
/*
 * Merges an object on top of a base object
 */
export function mergeObjects(base: any, override: any): any {
  if (!(base instanceof Object && override instanceof Object)) {
    return override;
  }

  const merged = { ...base, ...override };

  for (const key in override) {
    if (override[key] instanceof Object && !Array.isArray(override[key])) {
      // Key may not exist in base but merge function will resolve
      merged[key] = mergeObjects(base[key], override[key]);
    }
  }

  return merged;
}

function lexify(str: string): string[] {
  let nestCount = 0;
  let token = '';
  const tokens = [];

  for (const c of str.trim()) {
    if (c === '(') {
      nestCount++;
    } else if (c === ')') {
      nestCount--;
    } 

    if (c === ',' && nestCount === 0) {
      tokens.push(token);
      token = '';
    } else {
      token += c.trim();
    }
  }

  if (token !== '') {
    tokens.push(token);
  }

  if (nestCount !== 0) {
    throw new ValidationError('Unbalanced parentheses');
  }

  return tokens;
}

function _parseExpand(expand?: string, fields?: string): PropSelectRestIntersection {
  const fieldSelect = lexify(fields === undefined ? '' : fields)
    .filter(prop => !_.isEmpty(prop))
    .reduce((acc, prop) => {
      const match = prop.split('(');
      const property = match[0];
      const subProps = (
        match.length > 1 ? 
          lexify(match.slice(1).join('(').slice(0, -1)) : 
          []
      )
      .map(subProp => _parseExpand(undefined, subProp))
      .reduce((subAcc, parsedSubProp) => ({
        ...subAcc,
        ...parsedSubProp
      }), {});

      return {
        ...acc,
        [property]: _.isEmpty(subProps) ? true : { $select: subProps }
      };

    }, {})

  const select = lexify(expand === undefined ? '' : expand)
    .filter(prop => !_.isEmpty(prop))
    .reduce((acc, prop) => {
      const match = prop.split('(');
      const property = match[0];
      const subProps = (
        match.length > 1 ? 
          lexify(match.slice(1).join('(').slice(0, -1)) : 
          []
      )        
      .map(subProp => _parseExpand(subProp, undefined))
      .reduce((subAcc, parsedSubProp) => ({
        ...subAcc,
        ...parsedSubProp
      }), {});

      return {
        ...acc,
        [property]: {
          $expand: true,
          $select: {
            ...subProps,
            $rest: true
          }
        },
        $rest: true
      }
    }, {});

  return {
    ..._.merge(select, fieldSelect),
    ...(_.isEmpty(fieldSelect) ? { $rest: true } : {})
  };
}

export interface ControllerOptions {
  version: number;
}

export function httpController(options: ControllerOptions, path: string, ...args: interfaces.Middleware[]): (target: any) => void {
  return controller(`/api/v${ options.version }${ path }`, 'LoggerMiddleware', 'MemoizeMiddleware', 'CacheMiddleware', 'LocaleMiddleware', ...args);
}

export function createMethod(target: any, propertyName: string, propertyDescriptor: PropertyDescriptor): void {
  const method = propertyDescriptor.value;

  propertyDescriptor.value = async function (...args: any[]): Promise<HttpResponseMessage> {
    const result = await method.apply(this, args);
    const response = new HttpResponseMessage(201);

    response.content = new JsonContent(result);

    return response;
  };
}

export function emptyMethod(target: any, propertyName: string, propertyDescriptor: PropertyDescriptor): void {
  const method = propertyDescriptor.value;

  propertyDescriptor.value = async function (...args: any[]): Promise<HttpResponseMessage> {
    await method.apply(this, args);

    return new HttpResponseMessage(204);
  };
}

export function deleteMethod(target: any, propertyName: string, propertyDescriptor: PropertyDescriptor): void {
  const method = propertyDescriptor.value;

  propertyDescriptor.value = async function (...args: any[]): Promise<HttpResponseMessage> {
    try {
      await method.apply(this, args);

      return new HttpResponseMessage(200);
    } catch (err) {
      if (err instanceof ResourceDoesNotExistError) {
        return new HttpResponseMessage(204);
      } else {
        throw err;
      }

    } 
  };
}

export function asyncMethod(target: any, propertyName: string, propertyDescriptor: PropertyDescriptor): void {
  const method = propertyDescriptor.value;

  propertyDescriptor.value = async function (...args: any[]): Promise<HttpResponseMessage> {
    const result = await method.apply(this, args);
    const response = new HttpResponseMessage(202);

    response.content = new JsonContent(result);

    return response;
  };
}
export function authorizationHeader(): ParameterDecorator {
  return requestHeaders('Authorization');
}

export function withResponseType<M, R extends Response>(responseFormatter: (model: Expandable<M>) => R): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    const method = propertyDescriptor.value;

    propertyDescriptor.value = async function (...args: any[]): Promise<R | {}> {
      const result: Option<Expandable<M>> = await method.apply(this, args);

      if (isNone(result)) {
        throw new NotFoundError();
      }

      return responseFormatter(result.value);
    }
  };
}

export function withQueryParamArray(target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void {
  const method = propertyDescriptor.value;
  const queryArrayParams = Reflect.getOwnMetadata('queryParamArray', target, propertyName) || {};

  propertyDescriptor.value = function (...args: any[]): any {
    const normalizedArgs = args.map((arg: any, i: number) => {

      if (!queryArrayParams[i] || _.isArray(arg) || arg === undefined) {
        return arg;
      } else if (_.isString(arg) && arg.includes(',')) {
        return arg.split(',');
      } else {
       return [arg];
      }

    });

    return method.apply(this, normalizedArgs);
  };

}

export function queryParamArray(queryParamName: string): ParameterDecorator {

  return (target: any, propertyName: string | symbol | undefined, parameterIndex: number): void => {
    const name = propertyName || '';
    const existingQueryArrayParams = {
      ...Reflect.getOwnMetadata('queryParamArray', target, name),
      [parameterIndex]: true
    };

    Reflect.defineMetadata('queryParamArray', existingQueryArrayParams, target, name);

    queryParam(queryParamName)(target, name, parameterIndex);
  };
}

export function httpMethod(method: string, path: string, ...middleware: Array<string | symbol | interfaces.Middleware | express.RequestHandler>): MethodDecorator {
  const verb = method as keyof typeof HTTP_VERBS_ENUM;
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    withQueryParamArray(target, propertyName, propertyDescriptor);
    inversifyHttpMethod(verb, path, ...middleware)(target, propertyName.toString(), propertyDescriptor);
  };
}

export function httpGet(path: string, ...middleware: Array<string | symbol | interfaces.Middleware | express.RequestHandler>): MethodDecorator {
  return httpMethod('get', path, ...middleware);
}