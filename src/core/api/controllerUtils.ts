import _ from 'lodash';
import { controller, interfaces, HttpResponseMessage, JsonContent, requestHeaders } from 'inversify-express-utils';
import ResourceDoesNotExistError from './error/ResourceDoesNotExistError';
import { PropExpand } from './index';

export function parseExpand(expand?: string): PropExpand {

  return (expand === undefined ? '' : expand).split(',')
    .filter(prop => !_.isEmpty(prop))
    .map(prop => {
      const match = prop.match(/([^()]+)\((.+)\)$/);

      // return prop;

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
  return controller(`/api/v${ options.version }${ path }`, 'LoggerMiddleware', ...args);
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
