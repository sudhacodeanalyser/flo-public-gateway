import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpDelete,
  httpGet,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody,
  requestParam
} from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationError from '../../validation/ReqValidationError';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import {
  AlarmEvent,
  AlertFeedback, ClearAlertBodyCodec,
  NotificationStatistics,
  PaginatedResult,
  Receipt, ReceiptCodec, ServiceEventParamsCodec,
  UserFeedback,
  UserFeedbackCodec
} from '../api';
import { createMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService } from '../service';

export function DeliveryHookControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const serviceEventValidator = reqValidator.create(t.type({
    params: ServiceEventParamsCodec,
    body: ReceiptCodec
  }));

  @httpController({ version: apiVersion }, '/delivery/hooks')
  class DeliveryHookController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory
    ) {
      super();
    }

    @httpPost('/email/sendgrid/events', auth)
    private async registerSendgridEmailEvent(@request() req: Request, @requestBody() eventInfo: any): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .registerSendgridEmailEvent(eventInfo);
    }

    @httpPost('/sms/twilio/events', auth)
    private async registerTwilioSmsEvent(@request() req: Request, @requestBody() eventInfo: any): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .registerTwilioSmsEvent(eventInfo);
    }

    @httpPost('/email/service/events/:incidentId/:userId',
      auth,
      serviceEventValidator
    )
    private async registerEmailServiceEvent(
      @request() req: Request,
      @queryParam('incidentId') incidentId: string,
      @queryParam('userId') userId: string,
      @requestBody() receipt: Receipt
    ): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .registerEmailServiceEvent(incidentId, userId, receipt);
    }

    @httpPost('/sms/service/events/:incidentId/:userId',
      auth,
      serviceEventValidator
    )
    private async registerSmsServiceEvent(
      @request() req: Request,
      @queryParam('incidentId') incidentId: string,
      @queryParam('userId') userId: string,
      @requestBody() receipt: Receipt
    ): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .registerSmsServiceEvent(incidentId, userId, receipt);
    }
  }

  return DeliveryHookController;
}
