import * as t from 'io-ts';
import { convertEnumtoCodec } from '../enumUtils';

export enum FlowType {
  LIST = 'list',
  TEXT = 'text'
}

export enum ActionType {
  SLEEP_2H = 'sleep_2h',
  SLEEP_24H = 'sleep_24h'
}

export const FlowTypeCodec = convertEnumtoCodec(FlowType);
export const ActionTypeCodec = convertEnumtoCodec(ActionType);

export interface AlertFeedbackStep {
  titleText: string;
  type: FlowType;
  options: AlertFeedbackStepOption[];
}

export interface AlertFeedbackStepOption {
  property: string;
  displayText: string | undefined;
  sortOrder: number | undefined;
  action: ActionType | undefined;
  value: boolean | string | number | undefined;
  flow: AlertFeedbackStep | TaggedAlertFeedbackFlow | undefined;
}

export const TaggedAlertFeedbackFlowCodec = t.type({
  tag: t.string
});

export type TaggedAlertFeedbackFlow = t.TypeOf<typeof TaggedAlertFeedbackFlowCodec>;

export const AlertFeedbackStepCodec: t.Type<AlertFeedbackStep> = t.recursion('AlertFeedbackStep', () => t.interface({
  titleText: t.string,
  type: FlowTypeCodec,
  options: t.array(AlertFeedbackStepOptionCodec)
}));

export const AlertFeedbackStepOptionCodec: t.Type<AlertFeedbackStepOption> = t.recursion('AlertFeedbackStepOption', () => t.interface({
  property: t.string,
  displayText: t.union([t.string, t.undefined]),
  sortOrder: t.union([t.number, t.undefined]),
  action: t.union([ActionTypeCodec, t.undefined]),
  value: t.any,
  flow: t.union([AlertFeedbackStepCodec, TaggedAlertFeedbackFlowCodec, t.undefined])
}));

export const AlertFeedbackFlowCodec = t.type({
  systemMode: t.string,
  flow: AlertFeedbackStepCodec,
  flowTags: t.union([
    t.undefined,
    t.record(t.string, AlertFeedbackStepCodec)
  ])
});

export type AlertFeedbackFlow = t.TypeOf<typeof AlertFeedbackFlowCodec>;