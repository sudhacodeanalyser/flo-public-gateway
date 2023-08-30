import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as _ from 'lodash';
import { PhoneNumberUtil } from 'google-libphonenumber'

const phoneUtil = PhoneNumberUtil.getInstance();

export interface PhoneNumberBrand {
  readonly PhoneNumber: unique symbol
}

export type PhoneNumber = t.Branded<string, PhoneNumberBrand>

interface PhoneNumberCodec extends t.Type<PhoneNumber, string, unknown> {}



export const PhoneNumber: PhoneNumberCodec = t.brand(
  t.string,
  (s): s is PhoneNumber => {
    
    if (!_.isString(s)) {
      return false;
    } 

    try {
      const phoneNumber = phoneUtil.parse(s);

      return phoneUtil.isValidNumber(phoneNumber) && !phoneUtil.isAlphaNumber(s);
    } catch (err) {
      return false;
    }
  },
  'PhoneNumber'
);

export class PhoneNumberFactory {
  public static create(str: string): PhoneNumber {
    return pipe(
      PhoneNumber.decode(str),
      Either.getOrElse((err): PhoneNumber => { throw err; })
    );
  }
}