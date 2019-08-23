import * as t from 'io-ts';
import { convertEnumtoCodec } from '../enumUtils';
import { Omit } from '../../api';

export enum FloDetectFixtureName {
  IRRIGATION = 'irrigation',
  SHOWER_BATH = 'shower/bath',
  APPLIANCE = 'appliance',
  POOL_HOT_TUB = 'pool/hot tub',
  TOILET = 'toilet',
  FAUCET = 'faucet'
}

export const FloDetectFixtureNameCodec = convertEnumtoCodec(FloDetectFixtureName);

export enum  FloDetectStatus {
  SENT = 'sent', // legacy, unlikely to appear in new computations,
  EXECUTED = 'executed',
  FEEDBACK_SUBMITTED = 'feedback_submitted',
  LEARNING = 'learning',
  INSUFFICIENT_DATA = 'insufficient_data',
  INTERNAL_ERROR = 'internal_error'
}

export enum FloDetectCompuationDuration {
  TWENTY_FOUR_HOURS = '24h',
  SEVEN_DAYS = '7d'
}

export const FloDetectComputationDurationCodec = convertEnumtoCodec(FloDetectCompuationDuration);

export const FloDetectStatusCodec = convertEnumtoCodec(FloDetectStatus);

export const FloDetectComputationCodec = t.type({
  id: t.string,
  macAddress: t.string,
  startDate: t.string,
  endDate: t.string,
  fixtures: t.union([t.null, t.undefined, t.array(t.type({
    name: FloDetectFixtureNameCodec,
    index: t.number,
    type: t.number,
    gallons: t.number,
    ratio: t.number,
    numEvents: t.number
  }))]),
  status: FloDetectStatusCodec,
  duration: t.union([FloDetectComputationDurationCodec, t.string, t.null, t.undefined]),
  computeStartDate: t.union([t.undefined, t.null, t.string]),
  computeEndDate: t.union([t.undefined, t.null, t.string]),
  isStale: t.union([t.undefined, t.boolean])
});

export const FloDetectEventFeedbackCodec = t.type({
  case: t.number,
  correctFixture: t.string
});

export const FloDetectEventCodec = t.type({
  computationId: t.string,
  macAddress: t.string,
  feedback: t.union([FloDetectEventFeedbackCodec, t.null, t.undefined]),
  duration: t.number,
  fixture: t.string,
  type: t.number,
  start: t.string,
  end: t.string,
  flow: t.number,
  gpm: t.number
});



export const FloDetectLearningCodec = t.type({
  macAddress: t.string,
  status: FloDetectStatusCodec
});

export type FloDetectComputation = t.TypeOf<typeof FloDetectComputationCodec>;
export type FloDetectEventFeedback = t.TypeOf<typeof FloDetectEventFeedbackCodec>;
export type FloDetectEvent = t.TypeOf<typeof FloDetectEventCodec>;
export type FloDetectLearning = t.TypeOf<typeof FloDetectLearningCodec>;

export interface FloDetectEventPage {
  items: FloDetectEvent[]
}


