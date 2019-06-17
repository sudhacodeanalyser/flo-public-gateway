import * as t from 'io-ts';

export const ListItemCodec = t.type({
  key: t.string,
  shortDisplay: t.string,
  longDisplay: t.string
});

export type ListItem = t.TypeOf<typeof ListItemCodec>;

export const ListCodec = t.record(t.string, t.array(ListItemCodec));

export type List = t.TypeOf<typeof ListCodec>;