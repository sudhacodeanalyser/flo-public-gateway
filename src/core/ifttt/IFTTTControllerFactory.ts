import * as _ from 'lodash';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, request, requestBody, requestParam } from 'inversify-express-utils';
import { createMethod, httpController } from '../api/controllerUtils';
import { IFTTTServiceFactory } from './IFTTTService';
import UnauthorizedError from '../api/error/UnauthorizedError';
import Request from '../api/Request';
import { TestSetupResponse, UserInfoResponse } from './response/IFTTTResponse';
import { TriggerData, TriggerId } from './model/Trigger';
import { ActionData } from './model/Action';
import { AlarmSeverity } from '../api';
import { DirectiveServiceFactory } from '../device/DirectiveService';
import { DeviceSystemModeServiceFactory } from '../device/DeviceSystemModeService';
import { RealtimeData } from './request/RealtimeData';
import { $enum } from 'ts-enum-util';
import IFTTTAuthMiddlewareFactory from './IFTTTAuthMiddlewareFactory';

export function IFTTTControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<IFTTTAuthMiddlewareFactory>('IFTTTAuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/ifttt/v1')
  class IFTTTController extends BaseHttpController {

    constructor(
      @inject('IFTTTServiceFactory') private readonly iftttServiceFactory: IFTTTServiceFactory,
      @inject('IFTTTServiceKey') private readonly iftttServiceKey: string,
      @inject('DirectiveServiceFactory') private directiveServiceFactory: DirectiveServiceFactory,
      @inject('DeviceSystemModeServiceFactory') private deviceSystemModeServiceFactory: DeviceSystemModeServiceFactory,
    ) {
      super();
    }

    @httpGet('/status')
    private async getStatus(@request() req: Request): Promise<any> {
      if (req.header('ifttt-service-key') !== this.iftttServiceKey) {
        throw new UnauthorizedError();
      }
      return this.iftttServiceFactory(true).getStatus();
    }

    @httpPost('/test/setup')
    private async getTestSetup(@request() req: Request): Promise<TestSetupResponse> {
      if (req.header('ifttt-service-key') !== this.iftttServiceKey) {
        throw new UnauthorizedError();
      }
      return this.iftttServiceFactory(true).getTestSetup();
    }

    @httpGet('/user/info', auth)
    private async getUserInfo(@request() req: Request): Promise<UserInfoResponse> {
      const tokenMetadata = req.token;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).getUserInfo(tokenMetadata && tokenMetadata.user_id);
    }

    @httpPost('/triggers/critical_alert_detected', auth)
    private async getCriticalEventsTrigger(@request() req: Request, @requestBody() triggerData: TriggerData): Promise<any> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).getEventsBySeverityTrigger(userId, AlarmSeverity.CRITICAL, TriggerId.CRITICAL_ALERT_DETECTED, triggerData);
    }

    @httpPost('/triggers/warning_alert_detected', auth)
    private async getWarningEventsTrigger(@request() req: Request, @requestBody() triggerData: TriggerData): Promise<any> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).getEventsBySeverityTrigger(userId, AlarmSeverity.WARNING, TriggerId.WARNING_ALERT_DETECTED, triggerData);
    }

    @httpPost('/triggers/info_alert_detected', auth)
    private async getInfoEventsTrigger(@request() req: Request, @requestBody() triggerData: TriggerData): Promise<any> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).getEventsBySeverityTrigger(userId, AlarmSeverity.INFO, TriggerId.INFO_ALERT_DETECTED, triggerData);
    }

    @httpPost('/actions/turn_water_on', auth)
    private async openValveAction(@request() req: Request): Promise<any> {
      const directiveService = this.directiveServiceFactory.create(req);
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).openValveAction(userId, directiveService);
    }

    @httpPost('/actions/turn_water_off', auth)
    private async closeValveAction(@request() req: Request): Promise<any> {
      const directiveService = this.directiveServiceFactory.create(req);
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).closeValveAction(userId, directiveService);
    }

    @httpPost('/actions/change_device_mode', auth)
    private async changeSystemModeAction(@request() req: Request, @requestBody() actionData: ActionData): Promise<any> {
      const systemModeService = this.deviceSystemModeServiceFactory.create(req);
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).changeSystemModeAction(userId, actionData, systemModeService);
    }

    @httpPost('/notifications/alert', auth)
    private async notifyRealtimeAlert(@requestBody() realtimeData: RealtimeData): Promise<any> {
      const triggerId = $enum(TriggerId).asValueOrThrow(realtimeData.severity);
      return this.iftttServiceFactory(false).notifyRealtimeAlert(realtimeData.deviceId, triggerId);
    }

    @httpDelete('/triggers/:trigger_slug/trigger_identity/:trigger_identity', auth)
    private async deleteTriggerIdentity(
        @requestParam('trigger_slug') triggerSlug: string,
        @requestParam('trigger_identity') triggerIdentity: string,
        @request() req: Request): Promise<any> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      return this.iftttServiceFactory(tokenMetadata && tokenMetadata.is_ifttt_test).deleteTriggerIdentity(userId, triggerIdentity);
    }
  }

  return IFTTTController;
}
