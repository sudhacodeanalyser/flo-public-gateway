import { Expandable, Location, UserRegistrationTokenMetadata, TimestampedModel, User } from '../../api';
import * as t from 'io-ts';

export enum AccountType {
  ENTERPRISE = 'enterprise',
  PERSONAL = 'personal',
}

export enum AccountStatus {
  USER_INVITED = 'user_invited',
  ACCOUNT_CREATED = 'account_created'
}

export interface AccountUserRole {
  userId: string;
  roles: string[];
}

export interface AccountGroup {
  id: string;
  name: string;
}

export const AccountMutableCodec = t.partial({
  type: t.string
});

export type AccountMutable = t.TypeOf<typeof AccountMutableCodec>;

export interface Account extends TimestampedModel, AccountMutable {
  id: string;
  owner?: Expandable<User> | { id: '' };
  locations: Array<Expandable<Location>>;
  users: Array<Expandable<User>>;
  userRoles: AccountUserRole[];
  groups: Array<Expandable<AccountGroup>>;
  pendingInvites?: UserRegistrationTokenMetadata[];
}

export const AccountMergeValidator = t.type({
  sourceAccountId: t.string,
  destAccountId: t.string,
  locationMerge: t.union([
    t.undefined,
    t.array(t.type({
      sourceLocationId: t.string,
      destLocationId: t.string
    }))
  ])
});

export interface AccountMerge extends t.TypeOf<typeof AccountMergeValidator> {}
