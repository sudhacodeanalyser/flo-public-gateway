import * as t from 'io-ts';
import _ from 'lodash';
import { EmailAvailability } from '../../core/user/UserRegistrationService';

const EmailAvailablityResponse = t.type({
  is_registered: t.boolean,
  is_pending: t.boolean
});

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