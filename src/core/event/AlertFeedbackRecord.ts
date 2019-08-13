import * as t from 'io-ts';
import { morphism, StrictSchema } from 'morphism';
import { AlertFeedback } from '../api';

export const AlertFeedbackRecordDataCodec = t.type({
  icd_id: t.string,
  incident_id: t.string,
  alarm_id: t.union([t.undefined, t.number]),
  system_mode: t.union([t.undefined, t.number]),
  cause: t.number,
  should_accept_as_normal: t.boolean,
  plumbing_failure: t.union([t.undefined, t.number]),
  fixture: t.union([t.undefined, t.string]),
  cause_other: t.union([t.undefined, t.string]),
  plumbing_failure_other: t.union([t.undefined, t.string]),
  action_taken: t.union([t.undefined, t.string]),
  user_id: t.union([t.undefined, t.string])
});

export type AlertFeedbackRecordData = t.TypeOf<typeof AlertFeedbackRecordDataCodec>;

const AlertFeedbackRecordToModelSchema: StrictSchema<AlertFeedback, AlertFeedbackRecordData> = {
  deviceId: 'icd_id',
  incidentId: 'incident_id',
  alarmId: 'alarm_id',
  systemMode: (input: AlertFeedbackRecordData) => {
    switch (input.system_mode) {
      case 2:
        return 'home';
      case 3:
        return 'away';
      case 5:
        return 'sleep';
      default:
        return undefined;
    }
  },
  cause: 'cause',
  shouldAcceptAsNormal: 'should_accept_as_normal',
  plumbingFailure: 'plumbing_failure',
  fixture: 'fixture',
  causeOther: 'cause_other',
  plumbingFailureOther: 'plumbing_failure_other',
  actionTaken: 'action_taken',
  userId: 'user_id'
};

const AlertFeedbackModelToRecordSchema: StrictSchema<AlertFeedbackRecordData, AlertFeedback> = {
  icd_id: 'deviceId',
  incident_id: 'incidentId',
  alarm_id: 'alarmId',
  system_mode: (input: AlertFeedback) => {

    switch (input.systemMode) {
      case 'home':
        return 2;
      case 'away':
        return 3;
      case 'sleep':
        return 5;
      default:
        return undefined;
    }
  },
  cause: 'cause',
  should_accept_as_normal: 'shouldAcceptAsNormal',
  plumbing_failure: 'plumbingFailure',
  fixture: 'fixture',
  cause_other: 'causeOther',
  plumbing_failure_other: 'plumbingFailureOther',
  action_taken: 'actionTaken',
  user_id: 'userId'
};

export class AlertFeedbackRecord {
  public static toModel(record: AlertFeedbackRecordData): AlertFeedback {
    return morphism(AlertFeedbackRecordToModelSchema, record);
  }

  public static fromModel(model: AlertFeedback): AlertFeedbackRecordData {
    return morphism(AlertFeedbackModelToRecordSchema, model);
  }
}
