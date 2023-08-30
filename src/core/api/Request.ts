import express from 'express';
import Logger from 'bunyan';
import * as _ from 'lodash';

export interface Token extends Record<string, any> {
  isAdmin(): boolean;
  isService(): boolean;
}

export default interface Request extends express.Request {
  log?: Logger;
  token?: Token;
  rawBody?: string;
}

export function extractIpAddress(req: Request): string {
  const xForwardedForHeader = req.headers && req.headers['x-forwarded-for'];
  const xForwardedFor = xForwardedForHeader === undefined ? '' : (_.isArray(xForwardedForHeader) ? xForwardedForHeader[0] : xForwardedForHeader).split(',')[0];

  return  xForwardedFor || (req.connection && req.connection.remoteAddress) || '';
}