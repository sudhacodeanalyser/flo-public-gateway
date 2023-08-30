import * as t from 'io-ts';
import { morphism, StrictSchema } from 'morphism';
import { AlertFeedback } from '../api';
import * as _ from 'lodash';

export const AlertFeedbackRecordDataCodec = t.intersection([
  t.type({
    icd_id: t.string,
    incident_id: t.string,
    alarm_id: t.union([t.undefined, t.number]),
    system_mode: t.union([t.undefined, t.number]),
    user_id: t.union([t.undefined, t.string]),
    created_at: t.string
  }),
  t.dictionary(t.string, t.any)
]);

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
  userId: 'user_id',
  createdAt: 'created_at',
  userFeedback: (input: AlertFeedbackRecordData) => {
    const {
      icd_id,
      incident_id,
      alarm_id,
      system_mode,
      user_id,
      created_at,
      ...userFeedback
    } = input;

    return _.map(userFeedback, (value, key) => ({ property: key, value }));
  }
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
  user_id: 'userId',
  created_at: (input: AlertFeedback) => input.createdAt || new Date().toISOString()
};

export class AlertFeedbackRecord {
  public static toModel(record: AlertFeedbackRecordData): AlertFeedback {
    return morphism(AlertFeedbackRecordToModelSchema, record);
  }

  public static fromModel(model: AlertFeedback): AlertFeedbackRecordData {
    const userFeedback = model.userFeedback.reduce(
      (acc, { property, value }) => ({ ...acc, [property]: value }), 
      {}
    );

    return {
       ...morphism(AlertFeedbackModelToRecordSchema, model),
       ...userFeedback
     };
  }
}
