import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import PingService from '../services/ping/PingService';

@controller('/', 'LoggerMiddleware')
export class PingController implements interfaces.Controller {
  constructor(
    @inject('PingService') private pingService: PingService
  ) {}

  @httpGet('/')
  private ping() {
    return this.pingService.ping();
  }
}