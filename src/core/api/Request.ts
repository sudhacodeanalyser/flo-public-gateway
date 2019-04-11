import express from 'express';
import Logger from 'bunyan';

export default interface Request extends express.Request {
  log?: Logger;
}