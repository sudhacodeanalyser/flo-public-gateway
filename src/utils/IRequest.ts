import express from 'express';
import Logger from 'bunyan';

export default interface IRequest extends express.Request {
  log?: Logger;
}