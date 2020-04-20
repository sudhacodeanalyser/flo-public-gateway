import * as t from 'io-ts';

interface ArrayUpToLengthBrand {
  readonly ArrayUpToLength: unique symbol
}

export const ArrayUpToLength = <C extends t.Mixed>(codec: C, length: number) => t.brand(
  t.array(codec),
  (arr): arr is t.Branded<Array<t.TypeOf<C>>, ArrayUpToLengthBrand> => arr.length <= length,
  'ArrayUpToLength'
);