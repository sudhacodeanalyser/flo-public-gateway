import * as t from 'io-ts';
import { Account, DeviceAlarmSettings, Expandable, Location, TimestampedModel } from '../../api';
import { NonEmptyString } from '../../api/validator/NonEmptyString';

export interface UserLocationRole {
  locationId: string;
  roles: string[];
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
  phoneMobile: NonEmptyString,
  locale: NonEmptyString
});

export const UserUpdateValidator = t.exact(t.partial(UserMutableCodec.props));
export type UserUpdate = t.TypeOf<typeof UserUpdateValidator>;

export interface User extends UserUpdate, TimestampedModel {
  id: string;
  email: string;
  password?: string;
  isActive?: boolean;
  locations: Array<Expandable<Location>>;
  alarmSettings: Array<Expandable<DeviceAlarmSettings, 'deviceId'>>;
  account: Expandable<Account>;
  locationRoles: UserLocationRole[];
  accountRole: UserAccountRole;
  enabledFeatures: string[];
}