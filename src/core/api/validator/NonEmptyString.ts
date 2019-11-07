import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

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

export class NonEmptyStringFactory {
  public static create(str: string): NonEmptyString {
    return pipe(
      NonEmptyString.decode(str),
      Either.getOrElse((err): NonEmptyString => { throw err; })
    );
  }
}