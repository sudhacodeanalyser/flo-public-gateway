import { Location as LocationModel, Omit, Expandable } from '../index';
import { Response, DeviceResponse, Device, SubscriptionResponse, Subscription, User, UserResponse, Account, AccountResponse } from './index';

export interface LocationResponse extends Omit<Expandable<LocationModel>, 'devices' | 'subscription' | 'users' | 'account'> {
  devices?: DeviceResponse[],
  subscription?: SubscriptionResponse,
  users?: UserResponse[],
  account?: AccountResponse
}

export class Location implements Response {
  public static fromModel(location: Expandable<LocationModel>): LocationResponse {
    
    return {
      ...location,
      devices: location.devices && location.devices.map(device => Device.fromModel(device)),
      subscription: location.subscription && Subscription.fromModel(location.subscription),
      users: location.users && location.users.map(user => User.fromModel(user)),
      account: location.account && Account.fromModel(location.account)
    };
  }
}