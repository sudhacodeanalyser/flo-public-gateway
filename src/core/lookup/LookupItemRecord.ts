import * as t from 'io-ts';
import { LookupItem, LookupItemCodec } from '../api';
import { either, isLeft } from 'fp-ts/lib/Either';

export const LookupItemRecordCodec = t.type({
  list_id: t.string,
  key_id: t.string,
  short_display: t.string,
  long_display: t.string,
  state: t.number,
  order: t.number
});

export type LookupItemRecord = t.TypeOf<typeof LookupItemRecordCodec>;

export enum LookupItemState {
  LEGACY = -1,
  DISABLED,
  ENABLED
}

const LookupItemFromRecord = new t.Type<LookupItem, LookupItemRecord, unknown>(
  'LookupItemFromRecord',
  (u: unknown): u is LookupItem => LookupItemCodec.is(u),
  (u: unknown, context: t.Context) => 
    either.map(LookupItemRecordCodec.validate(u, context), lookupItemRecord => ({
      key: lookupItemRecord.key_id,
      shortDisplay: lookupItemRecord.short_display,
      longDisplay: lookupItemRecord.long_display
    })),
  (lookupItemRecord: LookupItem) => ({
    list_id: '',
    key_id: lookupItemRecord.key,
    short_display: lookupItemRecord.shortDisplay,
    long_display: lookupItemRecord.longDisplay,
    state: LookupItemState.DISABLED,
    order: 0
  })
);

export function fromRecord(lookupItemRecord: LookupItemRecord): LookupItem {
  const result = LookupItemFromRecord.decode(lookupItemRecord);

  if (isLeft(result)) {
    throw new Error('Invalid record.');
  }

  return result.right;
}