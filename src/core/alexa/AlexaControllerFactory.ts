import { interfaces, httpGet, request, BaseHttpController, httpPost } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { httpController } from '../api/controllerUtils';
import Request from '../../core/api/Request';
import { AlexaService } from './AlexaService';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';

export function AlexaControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/app/alexa')
  class AlexaController extends BaseHttpController {
    constructor(
      @inject('AlexaService') private alexaService: AlexaService,
    ) {
      super();
    }

    @httpGet('')
    @httpGet('/ping')
    private async getPing(@request() req: Request): Promise<any> {
      return this.alexaService.getPing();
    }

    @httpGet('/client', auth)
    private async getClient(@request() req: Request): Promise<any> {
      return this.alexaService.getClientInfo(req.headers.authorization as string);
    }

    @httpGet('/authorize', auth)
    private async getAuthorize(@request() req: Request): Promise<any> {
      return this.alexaService.getAuthorizeScopes(req.headers.authorization as string, req.query);
    }

    @httpPost('/authorize', auth)
    private async postAuthorize(@request() req: Request): Promise<any> {
      return this.alexaService.postAuthorizeConfirm(req.headers.authorization as string, req.query, req.body);
    }
  }
  return AlexaControllerFactory;
}