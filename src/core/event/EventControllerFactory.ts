import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, PaginatedResult, NotificationCounts, UserFeedback, UserFeedbackCodec, AlertFeedback } from '../api';
import { httpController, createMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { EventService } from '../service';

export function EventControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithIcd = authMiddlewareFactory.create(async ({ body: { deviceId } }) => ({icd_id: deviceId}));

  @httpController({ version: apiVersion }, '/events')
  class EventController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory,
      @inject('EventService') private eventService: EventService
    ) {
      super();
    }

    @httpGet('/alarms/statistics', auth)
    private async retrieveStatistics(@request() req: Request): Promise<NotificationCounts> {
      const filters = req.url.split('?')[1] || '';

      return this
        .notificationServiceFactory
        .create(req)
        .retrieveStatistics(filters);
    }

    @httpPost('/alarms', auth)
    private async sendAlarm(@request() req: Request, @requestBody() alarmInfo: any): Promise<string> {
      return this
        .notificationServiceFactory
        .create(req)
        .sendAlarm(alarmInfo);
    }

    @httpGet('/alarms/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getAlarmEvent(@requestParam('id') id: string): Promise<AlarmEvent> {
      return this.eventService.getAlarmEvent(id);
    }

    @httpDelete('/alarms/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async deleteAlarmEvent(@request() req: Request, @requestParam('id') id: string): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .deleteAlarmEvent(id);
    }

    @httpGet('/alarms',
      authMiddlewareFactory.create(async ({ query: { deviceId, locationId } }) => ({ icd_id: deviceId, location_id: locationId }))
      // TODO: deviceId is optional, how I can ask for admin role if is not present or customer role if has deviceId
      // TODO: Is not possible to do right now with the auth system, we may need to split this in 2 endpoints
    )
    private async getAlarmEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {
      const filters = req.url.split('?')[1] || '';

      return this.eventService.getAlarmEventsByFilter(filters);
    }

    @httpPost('/alarms/sample', authWithIcd)
    private async generateRandomEvents(@request() req: Request, @requestBody() data: any): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .generateEventsSample(data);
    }

    @httpPost('/incidents/:id/feedback', 
      authWithIcd,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
        }),
        body: t.intersection([
          UserFeedbackCodec, 
          t.type({ deviceId: t.string }), 
          t.partial({ alarmId: t.number, systemMode: t.string })
        ])
      }))
    )
    @createMethod
    private async submitIncidentFeedback(@request() req: Request, @requestParam('id') incidentId: string, @requestBody() userFeedback: UserFeedback & { deviceId: string, alarmId: number | undefined, systemMode: string | undefined }): Promise<AlertFeedback> {
      const tokenMetadata = req.token;
      const alertFeedback: AlertFeedback = {
        ...userFeedback,
        incidentId
      }

      return pipe(
        await this.eventService.submitFeedback(alertFeedback, tokenMetadata && tokenMetadata.user_id),
        Either.fold(
          forbiddenError => { throw forbiddenError },
          createdAlertFeedback => createdAlertFeedback
        )
      );
    }
  }

  return EventController;
}