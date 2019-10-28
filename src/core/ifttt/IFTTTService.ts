import { TestSetupResponse, UserInfoResponse, AlertTriggerResponse } from "./response/IFTTTResponse";
import { TriggerData, TriggerId } from "./model/Trigger";
import { AlarmSeverity } from "../api";

export type IFTTTServiceFactory = (isTest: boolean) => IFTTTService;

export interface IFTTTService {
  getStatus(): Promise<void>
  getTestSetup(iftttServiceKey: string): Promise<TestSetupResponse>
  getUserInfo(userId: string): Promise<UserInfoResponse>
  getEventsBySeverityTrigger(userId: string, severity: AlarmSeverity, floTriggerId: TriggerId, triggerData: TriggerData): Promise<AlertTriggerResponse>
  openValveAction(userId: string): Promise<any>
  closeValveAction(userId: string): Promise<any>
  changeSystemModeAction(userId: string, userAction: any): Promise<any>
}
