import * as t from 'io-ts';

export const AlertFeedbackCodec = t.type({
  incidentId: t.string,
  deviceId: t.string,
  alarmId: t.union([t.number, t.undefined]),
  systemMode: t.union([t.string, t.undefined]),
  userId: t.union([t.undefined, t.string]),
  createdAt: t.union([t.undefined, t.string]),
  userFeedback: t.array(t.type({
    property: t.string,
    value: t.any
  }))
});

export type AlertFeedback = t.TypeOf<typeof AlertFeedbackCodec>;