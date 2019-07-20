import { User as UserModel, Omit, Expandable } from '../index';
import { Response, Location, LocationResponse, Account, AccountResponse } from './index';

export interface UserResponse extends Omit<Expandable<UserModel>, 'locations' | 'account'> {
  locations?: LocationResponse[],
  account?: AccountResponse
}

export class User implements Response {
  public static fromModel(user: Expandable<UserModel>): UserResponse {
    return {
      ...user,
      locations: user.locations && user.locations.map(location => Location.fromModel(location)),
      account: user.account && Account.fromModel(user.account)
    };
  }
}