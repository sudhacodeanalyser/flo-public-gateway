import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, interfaces, queryParam, request, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Alarm, AlarmListResult } from '../api';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationService } from '../notification/NotificationService';
import { AlarmService } from '../service';

export function AlarmControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/alarms')
  class AlarmController extends BaseHttpController {
    constructor(
      @inject('NotificationService') private notificationService: NotificationService,
      @inject('AlarmService') private alarmService: AlarmService
    ) {
      super();
    }

    @httpGet('/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.record(t.string, t.any)
      }))
    )
    private async getAlarmById(@request() req: Request, @requestParam('id') id: string): Promise<Alarm> {
      const queryParams = {
        userId: req.token && req.token.user_id,
        ...req.query
      };
      return this.alarmService.getAlarmById(id, queryParams);
    }

    @httpGet('/', auth)
    private async getAlarms(@request() req: Request): Promise<AlarmListResult> {
      const queryParams = {
        userId: req.token && req.token.user_id,
        enabled: true,
        ...req.query
      };
      return this.alarmService.getAlarms(queryParams);
    }
  }

  return AlarmController;
}