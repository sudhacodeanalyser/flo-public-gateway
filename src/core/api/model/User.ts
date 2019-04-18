import { Expandable, TimestampedModel, Location, Account } from '../api';

export interface UserLocation extends Location {
  roles: string[]
}

export interface UserAccount extends Account {
  roles: string[]
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
  locations: Array<Expandable<UserLocation>>,
  account: Expandable<UserAccount>,
  firstName?: string,
  middleName?: string,
  lastName?: string,
  prefixName?: string,
  suffixName?: string,
  unitSystem?: UnitSystem
  phoneMobile?: string
}