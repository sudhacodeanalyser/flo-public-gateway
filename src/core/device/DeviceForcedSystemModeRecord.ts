import * as t from 'io-ts';

export const DeviceForcedSystemModeRecordCodec = t.type({
  icd_id: t.string,
  system_mode: t.union([t.undefined, t.null, t.Int]),
  performed_by_user_id: t.union([t.undefined, t.null, t.string])
});

export type DeviceForcedSystemModeRecord = t.TypeOf<typeof DeviceForcedSystemModeRecordCodec>;