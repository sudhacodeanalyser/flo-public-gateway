import { morphism, StrictSchema } from 'morphism';
import { Timestamped, User } from '../api';
import { UserDetailRecordData } from './UserDetailRecord';

export interface UserRecordData extends Timestamped {
  id: string,
  email: string,
  email_hash: string,
  password: string,
  source?: string,
  is_active?: boolean
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
  enabledFeatures: (input: UserRecordData & UserDetailRecordData) => {
    return input.enabled_features ? input.enabled_features : []
  }
}

export class UserRecord {

  constructor(
    public data: UserRecordData & UserDetailRecordData
  ) {}

  public toModel(): User {
    return morphism(RecordToModelSchema, this.data);
  }
}