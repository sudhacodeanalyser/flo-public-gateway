import { Container, inject } from 'inversify';
import {
  BaseHttpController, httpGet,
  httpPut,
  interfaces,
  request,
  requestBody,
  requestParam
} from 'inversify-express-utils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import {Alarm, ClearAlertResponse} from '../api';
import {asyncMethod, httpController} from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';

export function AlarmControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
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

    @httpGet('/', auth)
    @asyncMethod
    private async getAlarmById(@request() req: Request, @requestParam('id') id: string): Promise<Alarm> {
      return this
        .notificationServiceFactory
        .create(req)
        .getAlarmById(id);
    }

    @httpGet('/:id', auth)
    @asyncMethod
    private async getAlarms(@request() req: Request): Promise<Alarm> {
      return this
        .notificationServiceFactory
        .create(req)
        .getAlarms();
    }

    @httpPut('/:id/clear', authWithIcd)
    @asyncMethod
    private async clearAlarm(@request() req: Request, @requestParam('id') id: string, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .clearAlarm(id, data)
    }

    @httpPut('/clear', authWithLocation)
    @asyncMethod
    private async clearAlarms(@request() req: Request, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .clearAlarms(data);
    }
  }

  return AlarmController;
}