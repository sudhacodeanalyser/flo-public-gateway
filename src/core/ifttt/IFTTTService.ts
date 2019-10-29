import { TestSetupResponse, UserInfoResponse, AlertTriggerResponse, ActionResponse } from './response/IFTTTResponse';
import { TriggerData, TriggerId } from './model/Trigger';
import { AlarmSeverity } from '../api';
import { DirectiveService } from '../device/DirectiveService';
import { ActionData } from './model/Action';
import { DeviceSystemModeService } from '../device/DeviceSystemModeService';

export type IFTTTServiceFactory = (isTest: boolean) => IFTTTService;

export interface IFTTTService {
  getStatus(): Promise<any>
  getTestSetup(): Promise<TestSetupResponse>
  getUserInfo(userId: string): Promise<UserInfoResponse>
  getEventsBySeverityTrigger(userId: string, severity: AlarmSeverity, floTriggerId: TriggerId, triggerData: TriggerData): Promise<AlertTriggerResponse>
  openValveAction(userId: string, directiveService: DirectiveService): Promise<ActionResponse>
  closeValveAction(userId: string, directiveService: DirectiveService): Promise<ActionResponse>
  changeSystemModeAction(userId: string, userAction: ActionData, systemModeService: DeviceSystemModeService): Promise<ActionResponse>
  notifyRealtimeAlert(deviceId: string, triggerId: TriggerId): Promise<void>
  deleteTriggerIdentity(userId: string, triggerIdentity: string): Promise<void>
}
