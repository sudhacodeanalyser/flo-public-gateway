import { Expandable, Timestamped, Location, Account } from '../api';

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

export interface User extends Timestamped {
  id: string,
  email: string,
  password?: string,
  is_active?: boolean,
  locations: Array<Expandable<UserLocation>>,
  account: Expandable<UserAccount>,
  firstname?: string,
  middlename?: string,
  lastname?: string,
  prefixname?: string,
  suffixname?: string,
  unit_system?: UnitSystem
  phone_mobile?: string
}