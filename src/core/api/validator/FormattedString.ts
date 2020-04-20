import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

export interface FormattedStringBrand {
  readonly FormattedString: unique symbol
}

export type FormattedString = t.Branded<string, FormattedStringBrand>

interface FormattedStringCodec extends t.Type<FormattedString, string, unknown> {}

type CheckFormat = (s: string) => boolean;

export const FormattedString = (checkFormat: CheckFormat) => t.brand(
  t.string,
  (s): s is FormattedString => checkFormat(s),
  'FormattedString'
);

export class FormattedStringFactory {
  public static create(str: string, checkFormat: CheckFormat): FormattedString {
    return pipe(
      FormattedString(checkFormat).decode(str),
      Either.getOrElse((err): FormattedString => { throw err; })
    );
  }
}