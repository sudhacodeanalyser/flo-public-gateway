import express from 'express';
import Logger from 'bunyan';

export interface Token extends Record<string, any> {
  isAdmin(): boolean;
}

export default interface Request extends express.Request {
  log?: Logger;
  token?: Token;
  rawBody?: string;
}