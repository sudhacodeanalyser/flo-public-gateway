import * as t from 'io-ts';
import { PhoneNumber } from '../../core/api/validator/PhoneNumber';
import { Email } from '../../core/api/validator/Email';

const AuthCodec = t.type({
  Authorization: t.string,
})

export const HasAuthorizationValidator = t.partial(AuthCodec.props)

const NewUserSyncCodec = t.type({
  email: t.union([Email, t.undefined]),
  firstName: t.union([t.string, t.undefined]),
  lastName: t.union([t.string, t.undefined]),
  phone: t.union([PhoneNumber, t.undefined]),
  locale: t.union([t.string, t.undefined]),
})

export const NewUserSyncValidator = t.partial(NewUserSyncCodec.props);