import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';
import { injectable, inject, Container } from 'inversify';
import PingService from './PingService';

export function PingControllerFactory(container: Container) {
  @controller('/', 'LoggerMiddleware')
  class PingController implements interfaces.Controller {
    constructor(
      @inject('PingService') private pingService: PingService
    ) {}

    @httpGet('/')
    private ping() {
      return this.pingService.ping();
    }
  }

  return PingController;
}