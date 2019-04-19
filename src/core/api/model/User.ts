import { Expandable, TimestampedModel, Location, Account } from '../api';

export interface UserLocationRole {
  id: string;
  roles: string[];
}

export interface UserAccountRole {
  id: string;
  roles: string[];
}

export enum UnitSystem {
  IMPERIAL_US = 'imperial_us',
  METRIC_KPA = 'metric_kpa'
}

export interface User extends TimestampedModel {
  id: string,
  email: string,
  password?: string,
  isActive?: boolean,
  locations: Array<Expandable<Location>>,
  account: Expandable<Account>,
  locationRoles: UserLocationRole[],
  accountRole: UserAccountRole
  firstName?: string,
  middleName?: string,
  lastName?: string,
  prefixName?: string,
  suffixName?: string,
  unitSystem?: UnitSystem
  phoneMobile?: string
}