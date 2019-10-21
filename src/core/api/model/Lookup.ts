import * as t from 'io-ts';

export const LookupItemCodec = t.type({
  key: t.string,
  lang: t.string,
  shortDisplay: t.string,
  longDisplay: t.string,
  data: t.union([t.any,t.undefined])
});

export type LookupItem = t.TypeOf<typeof LookupItemCodec>;

export const LookupCodec = t.record(t.string, t.array(LookupItemCodec));

export type Lookup = t.TypeOf<typeof LookupCodec>;