import * as t from 'io-ts';

export const AlertFeedbackCodec = t.type({
  incidentId: t.string,
  deviceId: t.string,
  alarmId: t.union([t.number, t.undefined]),
  systemMode: t.union([t.string, t.undefined]),
  cause: t.number,
  shouldAcceptAsNormal: t.boolean,
  plumbingFailure: t.union([t.undefined, t.number]),
  fixture: t.union([t.undefined, t.string]),
  causeOther: t.union([t.undefined, t.string]),
  plumbingFailureOther: t.union([t.undefined, t.string]),
  actionTaken: t.union([t.undefined, t.string]),
  userId: t.union([t.undefined, t.string]),
  createdAt: t.union([t.undefined, t.string])
});

export type AlertFeedback = t.TypeOf<typeof AlertFeedbackCodec>;