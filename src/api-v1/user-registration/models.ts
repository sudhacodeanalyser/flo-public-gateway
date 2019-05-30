import * as t from 'io-ts';
import _ from 'lodash';

export const UserRegistrationDataCodec = t.type({
  email: t.string,
  password: t.string,
  firstName: t.string,
  lastName: t.string,
  country: t.string,
  phone: t.string
});

export type UserRegistrationData = t.TypeOf<typeof UserRegistrationDataCodec>;

const EmailAvailablityResponse = t.type({
  is_registered: t.boolean,
  is_pending: t.boolean
});

export interface EmailAvailability {
  isRegistered: boolean;
  isPending: boolean;
}

export const EmailAvailabilityCodec = new t.Type<EmailAvailability, t.TypeOf<typeof EmailAvailablityResponse>, unknown>(
  'EmailAvailability',
  (u: unknown): u is EmailAvailability => 
    _.isObject(u) && _.isBoolean((u as any).isRegistered) && _.isBoolean((u as any).isPending),
  (u: unknown, context: t.Context) => {
    return EmailAvailablityResponse.validate(u, context)
      .map(emailAvailibilityResponse => ({
        isPending: emailAvailibilityResponse.is_pending,
        isRegistered: emailAvailibilityResponse.is_registered
      }))
  },
  (a: EmailAvailability) => ({ is_pending: a.isPending, is_registered: a.isRegistered })
);