import * as t from 'io-ts';

interface MaxLengthStringBrand {
  readonly MaxLengthString: unique symbol
}

export type MaxLengthString = t.Branded<string, MaxLengthStringBrand>;

export const MaxLengthString = (length: number) => t.brand(
  t.string,
  (s): s is MaxLengthString => s.length <= length,
  'MaxLengthString'
);