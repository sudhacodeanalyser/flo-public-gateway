import { UserInfo } from '../model/UserInfo';

interface TestSetupData {
  accessToken: string;
  samples: {
    triggers: { [triggerName: string]: { alert_ids: string } },
    actions: { [actionName: string]: any }
  }
}

export interface TestSetupResponse {
  data: TestSetupData;
}

export interface UserInfoResponse {
  data: UserInfo;
}

export interface TriggerResponseMetadata {
  id: string;
  timestamp: number;
}

export interface AlertTrigger {
  alert_id: string;
  alert_name: string;
  system_mode: string;
  full_address: string;
  created_at: string;
  meta: TriggerResponseMetadata
}

export interface AlertTriggerResponse {
  data: AlertTrigger[];
}

export interface ActionResponseData {
  id: string | number;
}

export interface ActionResponse {
  data: ActionResponseData[]
}