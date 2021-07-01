import { interfaces, httpGet, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { httpController } from '../api/controllerUtils';
import Request from '../../core/api/Request';
import { AlexaService } from './AlexaService';

export function AlexaControllerFactory(container: Container, apiVersion: number): interfaces.Controller {

  @httpController({ version: apiVersion }, '/alexa')
  class AlexaController extends BaseHttpController {
    constructor(
      @inject('AlexaService') private alexaService: AlexaService,
    ) {
      super();
    }

    @httpGet('/ping')
    private async getPing(@request() req: Request): Promise<any> {
      return this.alexaService.getPing();
    }

    @httpGet('/client')
    private async getClient(@request() req: Request): Promise<any> {
      return this.alexaService.getClientInfo(req.headers.authorization as string);
    }
  }
  return AlexaControllerFactory;
}