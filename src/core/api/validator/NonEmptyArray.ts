import * as t from 'io-ts';

interface NonEmptyArrayBrand {
  readonly NonEmptyArray: unique symbol
}

export const NonEmptyArray = <C extends t.Mixed>(codec: C) => t.brand(
  t.array(codec),
  (arr): arr is t.Branded<Array<t.TypeOf<C>>, NonEmptyArrayBrand> => arr.length > 0,
  'NonEmptyArray'
)