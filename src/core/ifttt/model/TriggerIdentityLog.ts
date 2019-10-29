export interface TriggerIdentityLog {
  triggerIdentity: string;
  userId: string;
  floTriggerId: number;
  triggerSlug?: string;
  iftttSource?: {
    id: string,
    url: string
  };
  floTriggerIdTriggerIdentity?: string;
}