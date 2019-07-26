import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, httpPut, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Alarm, AlarmListResult, ClearAlertResponse } from '../api';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';

export function AlarmControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithIcd = authMiddlewareFactory.create(async ({ body: { icdId } }) => ({icd_id: icdId}));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { locationId } }) => ({ location_id: locationId }));

  @httpController({ version: apiVersion }, '/alarms')
  class AlarmController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory
    ) {
      super();
    }

    @httpGet('/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getAlarmById(@request() req: Request, @requestParam('id') id: string): Promise<Alarm> {
      return this
        .notificationServiceFactory
        .create(req)
        .getAlarmById(id);
    }

    @httpGet('/', auth)
    private async getAlarms(@request() req: Request): Promise<AlarmListResult> {
      const filters = req.url.split('?')[1] || '';

      return this
        .notificationServiceFactory
        .create(req)
        .getAlarms(filters);
    }

    @httpPut('/:id/clear',
      authWithIcd,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async clearAlarm(@request() req: Request, @requestParam('id') id: string, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .clearAlarm(id, data)
    }

    @httpPut('/clear', authWithLocation)
    private async clearAlarms(@request() req: Request, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .clearAlarms(data);
    }
  }

  return AlarmController;
}