import { TriggerIdentityLog } from './model/TriggerIdentityLog';

export interface TriggerIdentityLogRecordData {
  trigger_identity: string;
  user_id: string;
  flo_trigger_id: number;
  trigger_slug?: string;
  ifttt_source?: {
    id: string,
    url: string
  };
  flo_trigger_id_trigger_identity?: string;
}

export class TriggerIdentityLogRecord {
  constructor(
    private data: TriggerIdentityLogRecordData
  ) {}

  public toModel(): TriggerIdentityLog {
    return {
      triggerIdentity: this.data.trigger_identity,
      userId: this.data.user_id,
      floTriggerId: this.data.flo_trigger_id,
      triggerSlug: this.data.trigger_slug,
      floTriggerIdTriggerIdentity: this.data.flo_trigger_id_trigger_identity,
      iftttSource: this.data.ifttt_source
    }
  }
}