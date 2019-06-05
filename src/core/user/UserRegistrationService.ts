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

export const EmailVerificationCodec = t.type({
  clientId: t.string,
  clientSecret: t.string,
  token: t.string
})

export type EmailVerification = t.TypeOf<typeof EmailVerificationCodec>;

export const OAuth2ResponseCodec = t.type({
  access_token: t.string,
  refresh_token: t.string,
  expires_in: t.Int,
  token_type: t.union([t.undefined, t.literal('Bearer')]),
  user_id: t.string,
  expires_at: t.union([t.undefined, t.string]),
  issued_at: t.union([t.undefined, t.string])
});

export type OAuth2Response = t.TypeOf<typeof OAuth2ResponseCodec>;

export interface UserRegistrationService {
  acceptTermsAndVerifyEmail(data: UserRegistrationData): Promise<void>;
  checkEmailAvailability(email: string): Promise<EmailAvailability>;
  resendVerificationEmail(email: string): Promise<void>;
  verifyEmailAndCreateUser(emailVerification: EmailVerification): Promise<OAuth2Response>;
}