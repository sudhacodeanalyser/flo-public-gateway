import { Expandable, Timestamped, User, Account, Device } from '../api';
import * as t from 'io-ts';

export interface LocationUser extends Partial<User> {
  id: string,
  roles: string[]
}

// This will need to be enforced as a runtime validation
type Integer = number;

export interface Location extends Timestamped {
  id: string,
  account: Expandable<Account>,
  users: Array<Expandable<LocationUser>>,
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
  // TODO implement profile
}

// Add additional properties here as they are defined
export const LocationUpdateValidator = t.exact(t.partial({
  address: t.string,
  address2: t.string,
  city: t.string,
  state: t.string,
  postalcode: t.string,
  timezone: t.string,
  gallons_per_day_goal: t.number,
  occupants: t.number,
  stories: t.number
}));


export type LocationUpdate = t.TypeOf<typeof LocationUpdateValidator>;