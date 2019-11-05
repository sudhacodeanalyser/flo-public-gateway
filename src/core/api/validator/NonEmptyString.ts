import * as t from 'io-ts';

export interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}

export type NonEmptyString = t.Branded<string, NonEmptyStringBrand>

interface NonEmptyStringCodec extends t.Type<NonEmptyString, string, unknown> {}

export const NonEmptyString: NonEmptyStringCodec = t.brand(
  t.string,
  (s): s is NonEmptyString => s.trim().length > 0,
  'NonEmptyString'
)