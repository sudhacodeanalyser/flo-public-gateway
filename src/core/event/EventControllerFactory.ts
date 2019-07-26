import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, PaginatedResult } from '../api';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';

export function EventControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithIcd = authMiddlewareFactory.create(async ({ body: { icdId } }) => ({icd_id: icdId}));

  @httpController({ version: apiVersion }, '/events')
  class EventController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory
    ) {
      super();
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
    private async getAlarmEvent(@request() req: Request, @requestParam('id') id: string): Promise<AlarmEvent> {
      return this
        .notificationServiceFactory
        .create(req)
        .getAlarmEvent(id);
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
      authMiddlewareFactory.create(async ({ query: { icdId } }) => ({icd_id: icdId}))
      // TODO: icdId is optional, how I can ask for admin role if is not present or customer role if has icdId
      // TODO: Is not possible to do right now with the auth system, we may need to split this in 2 endpoints
    )
    private async getAlarmEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {
      const filters = req.url.split('?')[1] || '';

      return this
        .notificationServiceFactory
        .create(req)
        .getAlarmEventsByFilter(filters);
    }

    @httpPost('/alarms/sample', authWithIcd)
    private async generateRandomEvents(@request() req: Request, @requestBody() data: any): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .generateEventsSample(data);
    }
  }

  return EventController;
}