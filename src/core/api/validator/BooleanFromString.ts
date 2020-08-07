import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';

type BooleanType = t.TypeOf<typeof t.boolean>;

export const BooleanFromString = new t.Type<BooleanType, string, unknown>(
  'BooleanFromString',
  (u): u is BooleanType => t.boolean.is(u),
  (u, c) => {
    return Either.either.chain(t.string.validate(u, c), str => {
      return !str ? t.failure(str, c) : t.success(str === 'true');
    });
  },
  a => `${ a }`
);