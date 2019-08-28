import _ from 'lodash';
import { controller, interfaces, HttpResponseMessage, JsonContent, requestHeaders, queryParam, httpMethod as inversifyHttpMethod } from 'inversify-express-utils';
import ResourceDoesNotExistError from './error/ResourceDoesNotExistError';
import { PropExpand, Expandable } from './index';
import { Response } from './response';
import { Option, isNone } from 'fp-ts/lib/Option';
import express from 'express';

export function parseExpand(expand?: string): PropExpand {

  return (expand === undefined ? '' : expand).split(/,(?![^(]*\))/)
    .filter(prop => !_.isEmpty(prop))
    .map(prop => {
      const match = prop.match(/([^()]+)\((.*)\)$/);

      if (!match) {
        return prop;
      }

      return [match[1], ...match[2].split(',')];
    });
}

export interface ControllerOptions {
  version: number;
}

export function httpController(options: ControllerOptions, path: string, ...args: interfaces.Middleware[]): (target: any) => void {
  return controller(`/api/v${ options.version }${ path }`, 'LoggerMiddleware', 'MemoizeMiddleware', ...args);
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
        return {};
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

      if (!queryArrayParams[i] || _.isArray(arg)) {
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

  return (target: any, propertyName: string | symbol, parameterIndex: number): void => {
    const existingQueryArrayParams = {
      ...Reflect.getOwnMetadata('queryParamArray', target, propertyName),
      [parameterIndex]: true
    };

    Reflect.defineMetadata('queryParamArray', existingQueryArrayParams, target, propertyName);

    queryParam(queryParamName)(target, propertyName, parameterIndex);
  };
}

export function httpMethod(method: string, path: string, ...middleware: Array<string | symbol | interfaces.Middleware | express.RequestHandler>): MethodDecorator {
  return (target: any, propertyName: string | symbol, propertyDescriptor: PropertyDescriptor): void => {
    withQueryParamArray(target, propertyName, propertyDescriptor);
    inversifyHttpMethod(method, path, ...middleware)(target, propertyName.toString(), propertyDescriptor);
  };
}

export function httpGet(path: string, ...middleware: Array<string | symbol | interfaces.Middleware | express.RequestHandler>): MethodDecorator {
  return httpMethod('get', path, ...middleware);
}