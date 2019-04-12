import { Expandable, Timestamped, User, Account, Device } from '../api';

export interface DeviceUser extends User {
  roles: string[]
}

// This will need to be enforced as a runtime validation
type Integer = number;

export interface Location extends Timestamped {
  id: string,
  account: Expandable<Account>,
  users: Array<Expandable<DeviceUser>>,
  devices: Array<Expandable<Device>>,
  address: string,
  address2?: string,
  city: string,
  state: string,
  country: string,
  postalcode: string,
  timezone: string,
  gallons_per_day_goal: Integer,
  occupants?: Integer,
  stories?: Integer,
  is_profile_complete?: boolean,
  is_using_away_schedule?: boolean
  // TODO implement profile
}