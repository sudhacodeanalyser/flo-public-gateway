import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';

type Integer = t.TypeOf<typeof t.Integer>;

export const PositiveIntegerFromString = new t.Type<Integer, string, unknown>(
  'PositiveIntegerFromString',
  (u): u is Integer => t.Integer.is(u),
  (u, c) => {
    return Either.either.chain(t.string.validate(u, c), str => {
      const value = parseInt(str, 10);
      return !isNaN(value) && value > 0 ? t.success(value) : t.failure(str, c);
    });
  },
  a => `${ a }`
);