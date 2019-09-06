import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { createMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService } from '../service';

export function IncidentControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/incidents')
  class EventController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory,
      @inject('AlertService') private eventService: AlertService
    ) {
      super();
    }

    @httpPost('/raw', auth)
    private async createIncidentRaw(@request() req: Request, @requestBody() incidentInfo: any): Promise<string> {
      return this
        .notificationServiceFactory
        .create(req)
        .sendAlarm(incidentInfo);
    }

  }

  return EventController;
}