import { injectable, inject } from 'inversify';
import Logger from 'bunyan';
import Config from '../config';

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
}

export default LoggerFactory;