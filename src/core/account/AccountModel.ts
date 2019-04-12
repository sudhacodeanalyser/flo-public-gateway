import { Expandable, Timestamped, UserModel, LocationModel } from '../api/models';

export interface AccountUserModel extends UserModel {
  roles: string[]
}

export interface AccountModel extends Timestamped {
  id: string,
  owner: Expandable<UserModel>,
  locations: Array<Expandable<LocationModel>>,
  users: Array<Expandable<AccountUserModel>>
}