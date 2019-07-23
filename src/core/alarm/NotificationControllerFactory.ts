import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpDelete,
  httpGet,
  httpPost,
  httpPut,
  interfaces,
  queryParam, request,
  requestBody,
  requestParam
} from 'inversify-express-utils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import {
  ActionsSupportResponse,
  AlertEvent, AlertSettings, ClearAlertResponse, PaginatedResult
} from '../api';
import {asyncMethod, httpController} from '../api/controllerUtils';
import Request from "../api/Request";
import { NotificationServiceFactory } from './NotificationService';
import basicAuth from 'express-basic-auth';

export function NotificationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const appName = container.get<string>('appName');
  const env = container.get<string>('env');
  const docsEndpointUser = container.get<string>('docsEndpointUser');
  const docsEndpointPassword = container.get<string>('docsEndpointPassword');

  // Swagger Documentation
  const swaggerBasicAuth = basicAuth({
    challenge: true,
    realm: `${appName}-${env}`,
    users: {
      [docsEndpointUser]: docsEndpointPassword
    }
  });

  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithIcd = authMiddlewareFactory.create(async ({ body: { icdId } }) => ({icd_id: icdId}));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { locationId } }) => ({ location_id: locationId }));
  const authWithUser = authMiddlewareFactory.create(async ({ params: { userId } }) => ({user_id: userId}));

  @httpController({ version: apiVersion }, '/notifications')
  class NotificationController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory
    ) {
      super();
    }

    @httpGet('/docs', swaggerBasicAuth)
    @asyncMethod
    private async getDocs(@request() req: Request): Promise<string> {
      return this
        .notificationServiceFactory
        .create(req)
        .getDocs();
    }

    @httpPost('/events', auth)
    @asyncMethod
    private async sendAlert(@request() req: Request, @requestBody() alertInfo: any): Promise<string> {
      return this
        .notificationServiceFactory
        .create(req)
        .sendAlert(alertInfo);
    }

    @httpGet('/events/:id', auth)
    @asyncMethod
    private async getAlertEvent(@request() req: Request, @requestParam('id') id: string): Promise<AlertEvent> {
      return this
        .notificationServiceFactory
        .create(req)
        .getAlertEvent(id);
    }

    @httpDelete('/events/:id', auth)
    @asyncMethod
    private async deleteAlertEvent(@request() req: Request, @requestParam('id') id: string): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .deleteAlertEvent(id);
    }

    @httpGet('/events',
      authMiddlewareFactory.create(async ({ query: { icdId } }) => ({icd_id: icdId}))
      // TODO: icdId is optional, how I can ask for admin role if is not present or customer role if has icdId
      // TODO: Is not possible to do right now with the auth system, we may need to split this in 2 endpoints
    )
    @asyncMethod
    private async getAlertEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlertEvent>> {
      const filters = req.url.split('?')[1] || '';

      return this
        .notificationServiceFactory
        .create(req)
        .getAlertEventsByFilter(filters);
    }

    @httpPut('/alarm/:alarmId/clear', authWithIcd)
    @asyncMethod
    private async clearAlarm(@request() req: Request, @requestParam('alarmId') alarmId: string, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .clearAlarm(alarmId, data)
    }

    @httpPut('/alarm/clear', authWithLocation)
    @asyncMethod
    private async clearAlarms(@request() req: Request, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .clearAlarms(data);
    }

    @httpGet('/settings/:userId', authWithUser)
    @asyncMethod
    private async getAlarmSettings(@request() req: Request, @requestParam('userId') userId: string, @queryParam('icdId') icdId?: string): Promise<AlertSettings> {
      return this
        .notificationServiceFactory
        .create(req)
        .getAlarmSettings(userId, icdId);
    }

    @httpPost('/settings/:userId', authWithUser)
    @asyncMethod
    private async updateAlarmSettings(@request() req: Request, @requestParam('userId') userId: string, @requestBody() data: any): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .updateAlarmSettings(userId, data);
    }

    @httpPost('/events/sample', authWithIcd)
    @asyncMethod
    private async generateRandomEvents(@request() req: Request, @requestBody() data: any): Promise<void> {
      return this
        .notificationServiceFactory
        .create(req)
        .generateEventsSample(data);
    }

    @httpGet('/actions', auth)
    @asyncMethod
    private async getActions(@request() req: Request, @requestBody() data: any): Promise<ActionsSupportResponse> {
      return this
        .notificationServiceFactory
        .create(req)
        .getActions(data);
    }
  }

  return NotificationController;
}