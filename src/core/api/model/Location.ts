import { Expandable, TimestampedModel, User, Account, Device } from '../api';
import * as t from 'io-ts';

export interface LocationUserRole {
  userId: string,
  roles: string[]
}

// This will need to be enforced as a runtime validation
type Integer = number;

const LocationMutableCodec = t.type({
  address: t.string,
  address2: t.union([t.string, t.undefined]),
  city: t.string,
  state: t.string,
  country: t.string,
  postalCode: t.string,
  timezone: t.string,
  gallonsPerDayGoal: t.number,
  occupants: t.union([t.number, t.undefined]),
  stories: t.union([t.number, t.undefined]),
  isProfileComplete: t.union([t.boolean, t.undefined])
});

export const LocationCreateValidator = t.exact(LocationMutableCodec);
export type LocationCreate = t.TypeOf<typeof LocationCreateValidator>;

export interface Location extends LocationCreate, TimestampedModel {
  id: string,
  account: Expandable<Account>,
  userRoles: LocationUserRole[],
  users: Array<Expandable<User>>,
  devices: Array<Expandable<Device>>
  // TODO implement profile
}

// Add additional properties here as they are defined
export const LocationUpdateValidator = t.exact(t.partial(LocationMutableCodec.props));
export type LocationUpdate = t.TypeOf<typeof LocationUpdateValidator>;