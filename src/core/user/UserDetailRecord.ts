import { morphism, StrictSchema } from 'morphism';
import { Timestamped, User } from '../api';

export enum UnitSystem {
  IMPERIAL_US = 'imperial_us',
  METRIC_KPA = 'metric_kpa'
}

export interface UserDetailRecordData extends Timestamped {
  user_id: string;
  firstname?: string;
  middlename?: string;
  lastname?: string;
  prefixname?: string;
  suffixname?: string;
  unit_system?: UnitSystem; // Measurement unit prefence (e.g. metric vs freedom units)
  phone_mobile?: string;
  locale?: string;
  enabled_features?: string[];
}

const ModelToRecordSchema: StrictSchema<Partial<UserDetailRecordData>, Partial<User>> = {
  firstname: 'firstName',
  middlename: 'middleName',
  lastname: 'lastName',
  prefixname: 'prefixName',
  suffixname: 'suffixName',
  unit_system: 'unitSystem',
  phone_mobile: 'phoneMobile',
  locale: (input: Partial<User>) => {
    return input.locale || 'en-us';
  },
  enabled_features: 'enabledFeatures'
}

export class UserDetailRecord {

  public static fromModel(user: Partial<User>): Partial<UserDetailRecordData> {
    return morphism(ModelToRecordSchema, user) as UserDetailRecordData;
  }

}