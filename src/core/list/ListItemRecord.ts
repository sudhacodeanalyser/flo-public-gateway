import * as t from 'io-ts';
import { ListItem, ListItemCodec } from '../api';

export const ListItemRecordCodec = t.type({
  list_id: t.string,
  key_id: t.string,
  short_display: t.string,
  long_display: t.string,
  state: t.number,
  order: t.number
});

export type ListItemRecord = t.TypeOf<typeof ListItemRecordCodec>;

export enum ListItemState {
  LEGACY = -1,
  DISABLED,
  ENABLED
}

const ListItemFromRecord = new t.Type<ListItem, ListItemRecord, unknown>(
  'ListItemFromRecord',
  (u: unknown): u is ListItem => ListItemCodec.is(u),
  (u: unknown, context: t.Context) => 
    ListItemRecordCodec.validate(u, context)
      .map(listItemRecord => ({
        key: listItemRecord.key_id,
        shortDisplay: listItemRecord.short_display,
        longDisplay: listItemRecord.long_display
      })),
  (listItem: ListItem) => ({
    list_id: "",
    key_id: listItem.key,
    short_display: listItem.shortDisplay,
    long_display: listItem.longDisplay,
    state: ListItemState.DISABLED,
    order: 0
  })
);

export function fromRecord(listItemRecord: ListItemRecord): ListItem {
  const result = ListItemFromRecord.decode(listItemRecord);

  if (result.isLeft()) {
    throw new Error('Invalid record.');
  }

  return result.value;
}