import * as t from 'io-ts';

export const UserRegistrationDataCodec = t.type({
  email: t.string,
  password: t.string,
  firstName: t.string,
  lastName: t.string,
  country: t.string,
  phone: t.string
});

export type UserRegistrationData = t.TypeOf<typeof UserRegistrationDataCodec>;

export interface EmailAvailability {
  isRegistered: boolean;
  isPending: boolean;
}

export interface UserRegistrationService {
  acceptTermsAndVerifyEmail(data: UserRegistrationData): Promise<void>;
  checkEmailAvailability(email: string): Promise<EmailAvailability>;
  resendVerificationEmail(email: string): Promise<void>;
}