import { interfaces, controller, httpGet } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { PingService } from '../service';
import { httpController } from '../api/controllerUtils';

export function PingControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  @httpController({ version: apiVersion }, '/ping')
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