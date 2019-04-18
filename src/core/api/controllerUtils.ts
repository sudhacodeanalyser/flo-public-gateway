import _ from 'lodash';
import { controller, interfaces } from 'inversify-express-utils';

export function parseExpand(expand?: string): string[] {
  return (expand === undefined ? '' : expand).split(',').filter(prop => !_.isEmpty(prop))
}

export interface ControllerOptions {
  version: number;
}

export function httpController(options: ControllerOptions, path: string, ...args: interfaces.Middleware[]): (target: any) => void {
  return controller(`/api/v${ options.version }${ path }`, 'LoggerMiddleware', ...args);
}