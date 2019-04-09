import { injectable, inject } from 'inversify';
import Logger from 'bunyan';
import Config from '../../config';

@injectable()
class PingService {
  constructor(
    @inject('Config') private readonly config: typeof Config
  ) {}

  public ping() {
     return { date: new Date().toISOString(), app: this.config.appName };
  }
}

export default PingService;