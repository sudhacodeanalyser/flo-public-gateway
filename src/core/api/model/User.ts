import * as t from 'io-ts';
import { Account, DeviceAlarmSettings, DeviceStats, Expandable, Location, TimestampedModel } from '../../api';
import { NonEmptyString } from '../../api/validator/NonEmptyString';
import { PhoneNumber } from '../../api/validator/PhoneNumber';
import { Email } from '../../api/validator/Email';
import { Password } from '../../api/validator/Password';

export interface UserLocationRole {
  locationId: string;
  roles: string[];
  inherited?: Array<{ roles: string[], locationId: string }>
}

export interface UserAccountRole {
  accountId: string;
  roles: string[];
}

export enum UnitSystem {
  IMPERIAL_US = 'imperial_us',
  METRIC_KPA = 'metric_kpa'
}

const UnitSystemCodec = t.keyof({
  [UnitSystem.IMPERIAL_US]: null,
  [UnitSystem.METRIC_KPA]: null,
});

const UserMutableCodec = t.type({
  firstName: NonEmptyString,
  middleName: t.string,
  lastName: NonEmptyString,
  prefixName: t.string,
  suffixName: t.string,
  unitSystem: UnitSystemCodec,
  phoneMobile: PhoneNumber,
  locale: NonEmptyString,
  email: Email
});

export const UserUpdateValidator = t.exact(t.partial(UserMutableCodec.props));
export type UserUpdate = t.TypeOf<typeof UserUpdateValidator>;

const {
  firstName,
  lastName,
  phoneMobile,
  email,
  ...optionalProps
} = UserMutableCodec.props;

export const UserCreateCodec = t.intersection([
  t.type({
    firstName,
    lastName,
    phoneMobile,
    email,
    account: t.type({
      id: t.string
    }),
    password: Password
  }),
  t.partial({
    ...optionalProps,
    source: t.string
  })
]);

export type UserCreate = t.TypeOf<typeof UserCreateCodec>;

export interface User extends UserUpdate, TimestampedModel {
  id: string;
  password?: string;
  isActive?: boolean;
  locations: Array<Expandable<Location>>;
  alarmSettings: Array<Expandable<DeviceAlarmSettings, 'deviceId'>>;
  account: Expandable<Account>;
  locationRoles: UserLocationRole[];
  accountRole: UserAccountRole;
  enabledFeatures: string[];
}

const {
  account,
  email: emailValidator,
  ...userCreateRequireProps
} = UserCreateCodec.types[0].props;

export const InviteAcceptValidator = t.intersection([
  t.strict({ 
    ...userCreateRequireProps 
  }),
  t.exact(t.partial({
    ...UserCreateCodec.types[1].props
  }))
]);

export type InviteAcceptData = t.TypeOf<typeof InviteAcceptValidator>;

interface ValidInviteRoleBrand {
  readonly ValidInviteRole: unique symbol;
}

const ValidInviteRole = t.brand(
  t.string,
  (s): s is t.Branded<string, ValidInviteRoleBrand> => s.trim().toLowerCase() !== 'owner',
  'ValidInviteRole'
);

type ValidInviteRole = t.TypeOf<typeof ValidInviteRole>;

export const UserInviteCodec = t.type({
  email: Email,
  accountId: t.string,
  accountRoles: t.array(ValidInviteRole),
  locationRoles: t.array(t.type({
    locationId: t.string,
    roles: t.array(ValidInviteRole)
  })),
  locale: t.union([t.undefined, t.string])
});

export interface UserInvite extends t.TypeOf<typeof UserInviteCodec> {}

export interface UserStats {
  devices: DeviceStats;
}