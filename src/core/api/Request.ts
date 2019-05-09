import express from 'express';
import Logger from 'bunyan';

export type Token = {
  [claim: string]: any
};

export default interface Request extends express.Request {
  log?: Logger;
  token?: Token;
}