import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody, requestParam
} from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import {
  Receipt,
  ReceiptCodec,
  SendWithUsEvent,
  ServiceEventParamsCodec,
  TwilioStatusEvent,
  TwilioStatusEventCodec
} from '../api';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import TwilioAuthMiddlewareFactory from "./TwilioAuthMiddlewareFactory";

export function DeliveryHookControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const twilioAuthMiddlewareFactory = container.get<TwilioAuthMiddlewareFactory>('TwilioAuthMiddlewareFactory');
  const twilioAuth = twilioAuthMiddlewareFactory.create();
  const serviceEventValidator = reqValidator.create(t.type({
    params: ServiceEventParamsCodec,
    body: ReceiptCodec
  }));
  const twilioStatusEventValidator = reqValidator.create(t.type({
    params: ServiceEventParamsCodec,
    body: TwilioStatusEventCodec
  }));

  @httpController({ version: apiVersion }, '/delivery/hooks')
  class DeliveryHookController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory
    ) {
      super();
    }

    @httpPost('/email/events',
      // auth  // Ask helmut and See this: https://stackoverflow.com/questions/20865673/sendgrid-incoming-mail-webhook-how-do-i-secure-my-endpoint
    )
    private async registerSendgridEmailEvent(@request() req: Request, @requestBody() events: SendWithUsEvent[]): Promise<void> {
      return this
        .notificationServiceFactory
        .createNoAuth(req)
        .registerSendgridEmailEvent(events);
    }

    @httpPost('/email/events/:incidentId/:userId',
      auth,
      serviceEventValidator
    )
    private async registerEmailServiceEvent(
      @request() req: Request,
      @requestParam('incidentId') incidentId: string,
      @requestParam('userId') userId: string,
      @requestBody() receipt: Receipt
    ): Promise<void> {
      return this
        .notificationServiceFactory
        .createNoAuth(req)
        .registerEmailServiceEvent(incidentId, userId, receipt);
    }

    @httpPost('/sms/events/:incidentId/:userId',
      twilioAuth,
      twilioStatusEventValidator
    )
    private async registerSmsServiceEvent(
      @request() req: Request,
      @requestParam('incidentId') incidentId: string,
      @requestParam('userId') userId: string,
      @requestBody() event: TwilioStatusEvent
    ): Promise<void> {
      return this
        .notificationServiceFactory
        .createNoAuth(req)
        .registerSmsServiceEvent(incidentId, userId, event);
    }
  }

  return DeliveryHookController;
}
