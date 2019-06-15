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
import { httpController } from '../api/controllerUtils';
import { NotificationService } from '../service';
import Request from "../api/Request";

export function NotificationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithIcd = authMiddlewareFactory.create(async ({ body: { icdId } }) => ({icd_id: icdId}));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { locationId } }: Request) => ({ location_id: locationId }));
  const authWithUser = authMiddlewareFactory.create(async ({ params: { userId } }) => ({user_id: userId}));

  @httpController({ version: apiVersion }, '/notifications')
  class NotificationController extends BaseHttpController {
    constructor(
      @inject('NotificationService') private notificationService: NotificationService
    ) {
      super();
    }

    @httpGet('/docs',
      auth // TODO: Do we need auth on docs endpoint
    )
    private async getDocs(): Promise<string> {
      return this.notificationService.getDocs();
    }

    @httpPost('/events',
      auth // TODO: I need to check that is admin, this will not be used by customers apps
    )
    private async sendAlert(@requestBody() alertInfo: any): Promise<string> {
      return this.notificationService.sendAlert(alertInfo);
    }

    @httpGet('/events/:id',
      auth // TODO: I need to check that is admin, this will not be used by customers apps
    )
    private async getAlertEvent(@requestParam('id') id: string): Promise<AlertEvent> {
      return this.notificationService.getAlertEvent(id);
    }

    @httpDelete('/events/:id',
      auth // TODO: I need to check that is admin, this will not be used by customers apps
    )
    private async deleteAlertEvent(@requestParam('id') id: string): Promise<void> {
      return this.notificationService.deleteAlertEvent(id);
    }

    @httpGet('/events',
      authMiddlewareFactory.create(async ({ query: { icdId } }) => ({icd_id: icdId}))
      // TODO: icdId is optional, how I can ask for admin role if is not present or customer role if has icdId
    )
    private async getAlertEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlertEvent>> {
      const filters = req.url.split('?')[1] || '';

      return this.notificationService.getAlertEventsByFilter(filters);
    }

    @httpPut('/alarm/:alarmId/clear',
      authWithIcd
    )
    private async clearAlarm(@requestParam() alarmId: number, @requestBody() data: any): Promise<ClearAlertResponse> {
      return this.notificationService.clearAlarm(alarmId, data)
    }

    @httpPut('/alarm/clear',
      authWithLocation
    )
    private async clearAlarms(@requestBody() data: any): Promise<ClearAlertResponse> {
      return this.notificationService.clearAlarms(data);
    }

    @httpGet('/settings/:userId',
      authWithUser
    )
    private async getAlarmSettings(@requestParam() userId: string, @queryParam() icdId?: string): Promise<AlertSettings> {
      return this.notificationService.getAlarmSettings(userId, icdId);
    }

    @httpPost('/settings/:userId',
      authWithUser
    )
    private async updateAlarmSettings(@requestParam() userId: string, @requestBody() data: any): Promise<void> {
      return this.notificationService.updateAlarmSettings(userId, data);
    }

    @httpPost('/events/sample',
      authWithIcd
    )
    private async generateRandomEvents(@requestBody() data: any): Promise<void> {
      return this.notificationService.generateRandomEvents(data);
    }

    @httpGet('/actions',
      auth
    )
    private async getActions(@requestBody() data: any): Promise<ActionsSupportResponse> {
      return this.notificationService.getActions(data);
    }
  }

  return NotificationController;
}