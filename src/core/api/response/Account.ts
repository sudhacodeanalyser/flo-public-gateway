import { Account as AccountModel, Omit, Expandable } from '../index';
import { Response, LocationResponse, Location, User, UserResponse } from './index';

export interface AccountResponse extends Omit<Expandable<AccountModel>, 'owner' | 'locations' | 'users'> {
  owner?: UserResponse,
  users?: UserResponse[],
  locations?: LocationResponse[]
}

export class Account implements Response {
  public static fromModel(account: Expandable<AccountModel>): AccountResponse {
    return {
      ...account,
      owner: account.owner && User.fromModel(account.owner),
      users: account.users && account.users.map(user => User.fromModel(user)),
      locations: account.locations && account.locations.map(location => Location.fromModel(location))
    };
  }
}
