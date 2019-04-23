import { interfaces, controller, httpGet } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import PingService from './PingService';

export function PingControllerFactory(container: Container): interfaces.Controller {
  @controller('/ping', 'LoggerMiddleware')
  class PingController implements interfaces.Controller {
    constructor(
      @inject('PingService') private pingService: PingService
    ) {}

    @httpGet('/')
    private async ping(): Promise<{ [key: string]: any }> {
      return this.pingService.ping();
    }
  }

  return PingController;
}