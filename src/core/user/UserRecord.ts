import { morphism, StrictSchema } from 'morphism';
import { Timestamped, User, UserCreate } from '../api';
import { UserDetailRecordData } from './UserDetailRecord';

export interface UserRecordData extends Timestamped {
  id: string;
  email: string;
  password: string;
  source?: string;
  is_active?: boolean;
  is_system_user?: boolean;
  is_super_user?: boolean;
  account_id?: string;
}

const RecordToModelSchema: StrictSchema<User, UserRecordData & UserDetailRecordData> = {
  id: 'id',
  email: 'email',
  isActive: 'is_active',
  firstName: 'firstname',
  middleName: 'middlename',
  lastName: 'lastname',
  prefixName: 'prefixname',
  suffixName: 'suffixname',
  unitSystem: 'unit_system',
  phoneMobile: 'phone_mobile',
  locale: 'locale',
  locations: () => [],
  alarmSettings: () => [],
  locationRoles: () => [],
  accountRole: () => ({
    accountId: '',
    roles: []
  }),
  account: () => ({
    id: ''
  }),
  enabledFeatures: (input: UserDetailRecordData) => {
    return input.enabled_features ? input.enabled_features : []
  }
}


const PartialModelToRecordSchema: StrictSchema<Partial<UserRecordData>, Partial<User>> = {
  email: (input: Partial<User>) => input.email && input.email.toLowerCase().trim()
}


export class UserRecord {

  public static fromModel(user: Partial<User>): Partial<UserRecordData> {
    return morphism(PartialModelToRecordSchema, user);
  }

  constructor(
    public data: UserRecordData & UserDetailRecordData
  ) {}

  public toModel(): User {
    return morphism(RecordToModelSchema, this.data);
  }
}