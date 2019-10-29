export interface TriggerFields {
  alert_ids?: string;
}

export interface TriggerData {
  trigger_identity: string;
  triggerFields: TriggerFields;
  limit?: number;
  user?: any;
  trigger_slug?: string;
  ifttt_source?: {
    id: string,
    url: string
  };
}

export enum TriggerId {
  CRITICAL_ALERT_DETECTED = 1,
  WARNING_ALERT_DETECTED = 2,
  INFO_ALERT_DETECTED = 3,
};
