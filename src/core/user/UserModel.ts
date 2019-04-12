import { Expandable, Timestamped, LocationModel, AccountModel } from '../api/models';

export interface UserLocationModel extends LocationModel {
  roles: string[]
}

export interface UserAccountModel extends AccountModel {
  roles: string[]
}

export enum UnitSystem {
  IMPERIAL_US = 'imperial_us',
  METRIC_KPA = 'metric_kpa'
}

export interface UserModel extends Timestamped {
  id: string,
  email: string,
  password: string,
  is_active?: boolean,  
  locations: Array<Expandable<UserLocationModel>>,
  account: Expandable<UserAccountModel>,
  firstname?: string,
  middlename?: string,
  lastname?: string,
  prefixname?: string,
  suffixname?: string,
  unit_system?: UnitSystem
  phone_mobile?: string
}