import * as t from 'io-ts';
import * as _ from 'lodash';
import { EmailAvailability } from '../../core/user/UserRegistrationService';
import { either } from 'fp-ts/lib/Either';

const EmailAvailablityResponse = t.type({
  is_registered: t.boolean,
  is_pending: t.boolean
});


export const EmailAvailabilityCodec = new t.Type<EmailAvailability, t.TypeOf<typeof EmailAvailablityResponse>, unknown>(
  'EmailAvailability',
  (u: unknown): u is EmailAvailability => 
    _.isObject(u) && _.isBoolean((u as any).isRegistered) && _.isBoolean((u as any).isPending),
  (u: unknown, context: t.Context) => {
    return either.map(EmailAvailablityResponse.validate(u, context), emailAvailibilityResponse => ({
      isPending: emailAvailibilityResponse.is_pending,
      isRegistered: emailAvailibilityResponse.is_registered
    }));
  },
  (a: EmailAvailability) => ({ is_pending: a.isPending, is_registered: a.isRegistered })
);