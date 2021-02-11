import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpPost,
  interfaces,
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
  TwilioStatusEventCodec,
  TwilioVoiceCallStatusEvent
} from '../api';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { UnAuthNotificationService } from '../notification/NotificationService';
import TwilioAuthMiddlewareFactory from "./TwilioAuthMiddlewareFactory";

export function DeliveryHookControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const callbackGatewayHost = container.get<string>('CallbackGatewayHost');
  const callbackGatewayUrl = `https://${callbackGatewayHost}/twilio/voice/:userId/:incidentId`;
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const twilioAuthMiddlewareFactory = container.get<TwilioAuthMiddlewareFactory>('TwilioAuthMiddlewareFactory');
  const twilioAuth = (originHost?: string) => twilioAuthMiddlewareFactory.create(originHost);
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
      @inject('UnAuthNotificationService') private notificationService: UnAuthNotificationService
    ) {
      super();
    }

    @httpPost('/email/events',
      // auth  // Ask helmut and See this: https://stackoverflow.com/questions/20865673/sendgrid-incoming-mail-webhook-how-do-i-secure-my-endpoint
    )
    private async registerSendgridEmailEvent(@request() req: Request, @requestBody() events: SendWithUsEvent[]): Promise<void> {
      return this
        .notificationService
        .registerSendgridEmailEvent(events);
    }

    @httpPost('/email/events/:incidentId/:userId',
      auth,
      serviceEventValidator
    )
    private async registerEmailServiceEvent(
      @requestParam('incidentId') incidentId: string,
      @requestParam('userId') userId: string,
      @requestBody() receipt: Receipt
    ): Promise<void> {
      return this
        .notificationService
        .registerEmailServiceEvent(incidentId, userId, receipt);
    }

    // TODO: This endpoint should be forwarded from Callback API Gateway. Once that's done, TwilioAuthMiddleware can be simplified.
    @httpPost('/sms/events/:incidentId/:userId',
      twilioAuth(),
      twilioStatusEventValidator
    )
    private async registerSmsServiceEvent(
      @requestParam('incidentId') incidentId: string,
      @requestParam('userId') userId: string,
      @requestBody() event: TwilioStatusEvent
    ): Promise<void> {
      return this
        .notificationService
        .registerSmsServiceEvent(incidentId, userId, event);
    }

    @httpPost(
      '/voice/events/:incidentId/:userId',
      twilioAuth(callbackGatewayUrl)
    )
    private async registerVoiceCallStatusEvent(
      @requestParam('incidentId') incidentId: string,
      @requestParam('userId') userId: string,
      @requestBody() statusEvent: TwilioVoiceCallStatusEvent
    ): Promise<void> {
      return this
        .notificationService
        .registerVoiceCallStatus(incidentId, userId, statusEvent);
    }
  }

  return DeliveryHookController;
}
