import * as t from 'io-ts';

export const LegacyAuthTokenCodec = t.type({
  user: t.type({
    user_id: t.string,
    email: t.string
  }),
  timestamp: t.number,
  iat: t.number,
  exp: t.number
});

export const OAuth2TokenCodec = t.type({
  client_id: t.string,
  user_id: t.union([t.undefined, t.string]),
  jti: t.string,
  iat: t.number,
  exp: t.union([t.undefined, t.number])
});

export const RegistrationTokenCodec = t.type({
  jti: t.string,
  iat: t.number,
  exp: t.union([t.undefined, t.number])
});

export type TokenMetadata = any;