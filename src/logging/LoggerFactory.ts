import { injectable, inject } from 'inversify';
import Logger, { TRACE } from 'bunyan';
import Config from '../config/config';
import fs from 'fs';

@injectable()
class LoggerFactory {
  constructor(
    @inject('Config') private readonly config: typeof Config
  ) {}

  public createLogger(options?: Logger.LoggerOptions): Logger {
    return Logger.createLogger({
      name: this.config.appName || 'server',
      serializers: Logger.stdSerializers,
      ...options || {}
    });
  }

  public createFileLogger(options?: Logger.LoggerOptions): Logger {
    const writableStream = fs.createWriteStream('./trace.log');
    const logger = Logger.createLogger({
      name: this.config.appName || 'server',
      stream: writableStream, // process.stdout,
      serializers: Logger.stdSerializers,
      ...options || {},
      level: Logger.TRACE
    });
    return logger;
  }
}

export default LoggerFactory;