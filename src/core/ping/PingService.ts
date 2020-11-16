import { injectable, inject } from 'inversify';
import Config from '../../config/config';

@injectable()
class PingService {
  constructor(
    @inject('Config') private readonly config: typeof Config
  ) { }

  public ping(): { date: string, app: string, env: string } {
    return { date: new Date().toISOString(), app: this.config.appName, env: this.config.env ?? 'unknown' };
  }
}

export { PingService };