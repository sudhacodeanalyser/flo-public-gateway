import { Container, inject, multiInject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Subscription, SubscriptionCreate, SubscriptionCreateValidator, SubscriptionProviderWebhookHandler } from '../api';
import { createMethod, deleteMethod, httpController, parseExpand } from '../api/controllerUtils';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import * as Responses from '../api/response';
import { NotificationService } from '../service';

export function NotificationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create(undefined, 'ALL/api/v2/notifications');

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

    @httpPost('/event/:id',
      auth // TODO: I need to check that is admin, this will not be used by customers apps
    )
    private async sendAlert(@requestBody() alertInfo: any): Promise<string> {
      return this.notificationService.sendAlert(alertInfo);
    }

    @httpGet('/event/:id',
      auth // TODO: I need to check that is admin, this will not be used by customers apps
    )
    private async getAlertEvent(id: string): Promise<AlertEvent> {
      return this.notificationService.getAlertEvent(id);
    }

    @httpDelete('/event/:id',
      auth // TODO: I need to check that is admin, this will not be used by customers apps
    )
    private async deleteAlertEvent(@requestParam('id') id: string): Promise<void> {
      return this.notificationService.deleteAlertEvent(id);
    }

    @httpGet('/docs',
      auth // TODO: I need to check that is admin, this will not be used by mobile apps
    )
    private async getAlertEventsByFilter(filters: string): Promise<PaginatedResult<AlertEvent>> {
      return this.notificationService.getAlertEventsByFilter(filters);
    }

    private async clearAlarm(alarmId: number, data: any): Promise<ClearAlertResponse> {
      return this.notificationService.clearAlarm(alarmId, data)
    }

    private async clearAlarms(data: any): Promise<ClearAlertResponse> {
      return this.notificationService.clearAlarms(data);
    }

    private async getAlarmSettings(userId: string, icdId?: string): Promise<AlertSettings> {
      return this.notificationService.getAlarmSettings(userId, icdId);
    }

    private async updateAlarmSettings(userId: string, data: any): Promise<void> {
      return this.notificationService.updateAlarmSettings(userId, data);
    }

    private async generateRandomEvents(data: any): Promise<void> {
      return this.notificationService.generateRandomEvents(data);
    }

    private async getActions(data: any): Promise<ActionsSupportResponse> {
      return this.notificationService.getActions(data);
    }


    @httpPost(
      '/',
      auth
    )
    private async createSubscription(@requestBody() subscription: SubscriptionCreate): Promise<Responses.SubscriptionResponse> {
      const createdSubscription = await this.notificationService.createSubscription(subscription);

      return this.toResponse(createdSubscription);
    }

    @httpGet('/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getSubscription(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Responses.SubscriptionResponse | {}> {
      const expandProps = parseExpand(expand);
      const subscription = await this.notificationService.getSubscriptionById(id, expandProps);

      if (_.isEmpty(subscription)) {
        return subscription;
      }

      return this.toResponse(subscription as Subscription);
    }

    @httpDelete(
      '/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    @deleteMethod
    private async removeSubscription(@requestParam('id') id: string): Promise<void> {
      return this.notificationService.removeSubscription(id);
    }

    @httpPost(
      '/webhooks/stripe',
      'StripeWebhookAuthMiddleware'
    )
    private async handleStripeWebhook(@requestBody() event: { [key: string]: any }): Promise<void> {
      return this.getWebhookHandler('stripe').handle(event);
    }
  }

  return NotificationController;
}