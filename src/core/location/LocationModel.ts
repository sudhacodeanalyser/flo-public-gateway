import { Expandable, Timestamped, UserModel, AccountModel, DeviceModel } from '../api/models';

export interface DeviceUserModel extends UserModel {
  roles: string[]
}

// This will need to be enforced as a runtime validation
type Integer = number;

export interface LocationModel extends Timestamped {
  id: string,
  account: Expandable<AccountModel>,
  users: Array<Expandable<DeviceUserModel>>,
  devices: Array<Expandable<DeviceModel>>,
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