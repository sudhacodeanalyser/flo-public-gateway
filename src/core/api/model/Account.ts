import { Expandable, Location, TimestampedModel, User } from '../../api';

export interface AccountUserRole {
  userId: string;
  roles: string[];
}

export interface AccountGroup {
  id: string;
  name: string;
}

export interface Account extends TimestampedModel {
  id: string;
  owner: Expandable<User>;
  locations: Array<Expandable<Location>>;
  users: Array<Expandable<User>>;
  userRoles: AccountUserRole[];
  groups: Array<Expandable<AccountGroup>>;
}