import { Expandable, Timestamped, User, Location } from '../api';

export interface AccountUserRole {
  id: string,
  roles: string[]
}

export interface Account extends Timestamped {
  id: string,
  owner: Expandable<User>,
  locations: Array<Expandable<Location>>,
  users: Array<Expandable<User>>,
  userRoles: AccountUserRole[]
}