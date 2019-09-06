import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationError from '../../validation/ReqValidationError';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, AlertFeedback, NotificationStatistics, PaginatedResult, UserFeedback, UserFeedbackCodec } from '../api';
import { createMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService } from '../service';


export function IncidentControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
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

    @httpGet('/')
    private async getIncidentByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {
      const filters = req.url.split('?')[1] || '';

      if (_.isEmpty(req.query.deviceId) && _.isEmpty(req.query.locationId)) {
        throw new ReqValidationError('Missing deviceId or locationId parameters.');
      }

      return this.eventService.getAlarmEventsByFilter(filters);
    }

    @httpGet('/:id',
        reqValidator.create(t.type({
          params: t.type({
            id: t.string
          })
        }))
    )
    private async getIncident(@requestParam('id') id: string): Promise<AlarmEvent> {
      return this.eventService.getAlarmEvent(id);
    }
  }

  return EventController;
}