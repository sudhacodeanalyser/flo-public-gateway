import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as _ from 'lodash';
import validator from 'validator';

export interface EmailBrand {
  readonly Email: unique symbol
}

export type Email = t.Branded<string, EmailBrand>

interface EmailCodec extends t.Type<Email, string, unknown> {}

export const Email: EmailCodec = t.brand(
  t.string,
  (s): s is Email => {
    
    if (!_.isString(s)) {
      return false;
    } 

    try {
      return validator.isEmail(s.trim());
    } catch (err) {
      return false;
    }
  },
  'Email'
);

export class EmailFactory {
  public static create(str: string): Email {
    return pipe(
      Email.decode(str),
      Either.getOrElse((err): Email => { throw err; })
    );
  }
}