import * as t from 'io-ts';
import { convertEnumtoCodec } from '../api/enumUtils';
import { AlertFeedbackFlow, AlertFeedbackFlowCodec as AlertFeedbackFlowModelCodec, AlertFeedbackStep as AlertFeedbackStepModel, AlertFeedbackStepCodec as AlertFeedbackStepModelCodec, AlertFeedbackStepOption as AlertFeedbackStepOptionModel } from '../api';
import { morphism, StrictSchema } from 'morphism';
import _ from 'lodash';

enum FlowType {
  LIST = 'list',
  TEXT = 'text'
}

enum ActionType {
  SLEEP_2H = 'sleep_2h',
  SLEEP_24H = 'sleep_24h'
}

const FlowTypeCodec = convertEnumtoCodec(FlowType);
const ActionTypeCodec = convertEnumtoCodec(ActionType);

interface AlertFeedbackStep {
  title_text: string;
  type: FlowType;
  options: AlertFeedbackStepOption[];
}

interface AlertFeedbackStepOption {
  property: string;
  display_text: string | undefined;
  sort_order: number | undefined;
  action: ActionType | undefined;
  value: boolean | string | number | undefined;
  flow: AlertFeedbackStep | TaggedAlertFeedbackFlow | undefined;
}

const TaggedAlertFeedbackFlowCodec = t.type({
  tag: t.string
});

type TaggedAlertFeedbackFlow = t.TypeOf<typeof TaggedAlertFeedbackFlowCodec>;

const AlertFeedbackStepCodec: t.Type<AlertFeedbackStep> = t.recursion('AlertFeedbackStep', () => t.interface({
  title_text: t.string,
  type: FlowTypeCodec,
  options: t.array(AlertFeedbackStepOptionCodec)
}));

const AlertFeedbackStepOptionCodec: t.Type<AlertFeedbackStepOption> = t.recursion('AlertFeedbackStepOption', () => t.interface({
  property: t.string,
  display_text: t.union([t.string, t.undefined]),
  sort_order: t.union([t.number, t.undefined]),
  action: t.union([ActionTypeCodec, t.undefined]),
  value: t.union([t.boolean, t.string, t.number, t.undefined]),
  flow: t.union([AlertFeedbackStepCodec, TaggedAlertFeedbackFlowCodec, t.undefined])
}));

export const AlertFeedbackFlowRecordCodec = t.type({
  alarm_id: t.number,
  system_mode: t.number,
  flow: AlertFeedbackStepCodec,
  flow_tags: t.union([
    t.undefined,
    t.record(t.string, AlertFeedbackStepCodec)
  ])
});

const AlertFeedbackStepRecordToModelSchema: StrictSchema<AlertFeedbackStepModel, AlertFeedbackStep> = {
  titleText: 'title_text',
  type: 'type',
  options: (input: AlertFeedbackStep) => {
    return !input.options ? [] : input.options.map(option => morphism(AlertFeedbackStepOptionRecordToModelSchema, option))
  }
};

const AlertFeedbackStepOptionRecordToModelSchema: StrictSchema<AlertFeedbackStepOptionModel, AlertFeedbackStepOption> = {
  property: 'property',
  displayText: 'display_text',
  sortOrder: 'sort_order',
  action: 'action',
  value: 'value',
  flow: (input: AlertFeedbackStepOption) => {
    if (input.flow === undefined || TaggedAlertFeedbackFlowCodec.is(input.flow)) {
      return input.flow;
    } else {
      return morphism(AlertFeedbackStepRecordToModelSchema, input.flow);
    }
  }
};

export type AlertFeedbackFlowRecordData = t.TypeOf<typeof AlertFeedbackFlowRecordCodec>;

const AlertFeedbackFlowRecordToModelSchema: StrictSchema<AlertFeedbackFlow, AlertFeedbackFlowRecordData> = {
  systemMode: (input: AlertFeedbackFlowRecordData) => {
    switch (input.system_mode) {
      case 2:
        return 'home';
      case 3:
        return 'away';
      case 5:
        return 'sleep';
      default:
        return 'unknown';
    }
  },
  flow: (input: AlertFeedbackFlowRecordData) => {
    return morphism(AlertFeedbackStepRecordToModelSchema, input.flow);
  },
  flowTags: (input: AlertFeedbackFlowRecordData) => {
    return input.flow_tags && Object.keys(input.flow_tags)
      .reduce((acc, tag) => ({
        ...acc,
        [tag]: input.flow_tags && morphism(AlertFeedbackStepRecordToModelSchema, input.flow_tags[tag])
      }), {});
  }
};

export class AlertFeedbackFlowRecord {
  public static toModel(record: AlertFeedbackFlowRecordData): AlertFeedbackFlow {
    return morphism(AlertFeedbackFlowRecordToModelSchema, record);
  }
}
