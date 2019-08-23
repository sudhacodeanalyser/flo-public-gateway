import * as t from 'io-ts';
import { convertEnumtoCodec } from '../api/enumUtils';
import { FloDetectEvent, FloDetectEventFeedback } from '../api';
import { morphism, StrictSchema } from 'morphism';
import _ from 'lodash';

export const FloDetectEventFeedbackRecordDataCodec = t.type({
  case: t.number,
  correct_fixture: t.string
});

export const FloDetectEventChronologyRecordDataCodec = t.type({
  request_id: t.string,
  device_id: t.string,
  feedback: t.union([t.undefined, t.null, FloDetectEventFeedbackRecordDataCodec]),
  duration: t.number,
  fixture: t.string,
  type: t.number,
  start: t.string,
  end: t.string,
  flow: t.number,
  gpm: t.number,
  // Following properties are only used by the FloDetect Generator service
  // and are not relevant for clients
  cluster_means: t.union([t.undefined, t.null, t.array(t.number)]),
  label: t.union([t.undefined, t.null, t.array(t.number)]),
  not_label: t.union([t.undefined, t.null, t.array(t.number)]),
  sub_label: t.union([t.undefined, t.null, t.type({
    all: t.array(t.number),
    individual: t.number
  })]),
  not_sub_label: t.union([t.undefined, t.null, t.type({
    all: t.array(t.number),
    individual: t.number
  })])
});

export type FloDetectEventFeedbackRecordData = t.TypeOf<typeof FloDetectEventFeedbackRecordDataCodec>;
export type FloDetectEventChronologyRecordData = t.TypeOf<typeof FloDetectEventChronologyRecordDataCodec>;

const FloDetectEventFeedbackRecordToModelSchema: StrictSchema<FloDetectEventFeedback, FloDetectEventFeedbackRecordData> = {
  case: 'case',
  correctFixture: 'correct_fixture'
};

const FloDetectEventFeedbackModelToRecordSchema: StrictSchema<FloDetectEventFeedbackRecordData, FloDetectEventFeedback> = {
  case: 'case',
  correct_fixture: 'correctFixture'
};

const FloDetectEventRecordToModelSchema: StrictSchema<FloDetectEvent, FloDetectEventChronologyRecordData> = {
  computationId: 'request_id',
  macAddress: 'device_id',
  duration: 'duration',
  fixture: 'fixture',
  feedback: (input: FloDetectEventChronologyRecordData) => {
    return input.feedback && morphism(FloDetectEventFeedbackRecordToModelSchema, input.feedback);
  },
  type: 'type',
  start: 'start',
  end: 'end',
  flow: 'flow',
  gpm: 'gpm'
};

export class FloDetectEventChronologyRecord {
  public static toModel(record: FloDetectEventChronologyRecordData): FloDetectEvent {
    return morphism(FloDetectEventRecordToModelSchema, record);
  }

  public static convertFeedbackToPartialRecord(feedback: FloDetectEventFeedback): Partial<FloDetectEventChronologyRecordData> {
    return {
      feedback: morphism(FloDetectEventFeedbackModelToRecordSchema, feedback)
    };
  }
}