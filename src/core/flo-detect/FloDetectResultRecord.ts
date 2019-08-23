import * as t from 'io-ts';
import { convertEnumtoCodec } from '../api/enumUtils';
import { FloDetectComputation, FloDetectStatus, FloDetectStatusCodec, FloDetectFixtureNameCodec, FloDetectCompuationDuration } from '../api';
import { morphism, StrictSchema } from 'morphism';
import _ from 'lodash';

export const FloDetectResultRecordDataCodec = t.type({
  request_id: t.string,
  device_id: t.string,
  start_date: t.string,
  end_date: t.string,
  fixtures: t.union([t.null, t.undefined, t.array(t.type({
    name: FloDetectFixtureNameCodec,
    index: t.number,
    type: t.number,
    gallons: t.number,
    ratio: t.number,
    num_events: t.number
  }))]),
  status: FloDetectStatusCodec,
  compute_start_date: t.union([t.string, t.undefined, t.null]),
  compute_end_date: t.union([t.string, t.undefined, t.null]),
  duration_in_seconds: t.union([t.number, t.undefined])
});

export type FloDetectResultRecordData = t.TypeOf<typeof FloDetectResultRecordDataCodec>;

const FloDetectResultRecordToComputationModelSchema: StrictSchema<FloDetectComputation, FloDetectResultRecordData> = {
  id: 'request_id',
  macAddress: 'device_id',
  startDate: 'start_date',
  endDate: 'end_date',
  fixtures: (input: FloDetectResultRecordData) => input.fixtures && input.fixtures.map(fixture => ({
    name: fixture.name,
    index: fixture.index,
    type: fixture.index,
    gallons: fixture.gallons,
    ratio: fixture.ratio,
    numEvents: fixture.num_events
  })),
  status: 'status',
  computeStartDate: 'compute_start_date',
  computeEndDate: 'compute_end_date',
  duration: (input: FloDetectResultRecordData) => {
    if (input.duration_in_seconds === 86400) {
      return FloDetectCompuationDuration.TWENTY_FOUR_HOURS;
    } else if (input.duration_in_seconds === 604800) {
      return FloDetectCompuationDuration.SEVEN_DAYS;
    } else {
      return `${ input.duration_in_seconds }s`;
    }
  },
  isStale: () => undefined
};

export class FloDetectResultRecord {
  public static toModel(record: FloDetectResultRecordData): FloDetectComputation {
    return morphism(FloDetectResultRecordToComputationModelSchema, record);
  }
}