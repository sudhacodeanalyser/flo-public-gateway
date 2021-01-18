import { morphism, StrictSchema } from 'morphism';
import { UserEmailChange, EmailChangeConfirmed } from '../api';

export interface UserEmailChangeData {
  id: number;
  user_id: string;
  old_email: string;
  old_conf_key: string;
  old_conf_on?: string;
  new_email: string;
  new_conf_key: string;
  new_conf_on?: string;
  created: string;
}

const UserEmailChangeRecordToModelSchema: StrictSchema<UserEmailChange, UserEmailChangeData> = {
  id: 'id',
  userId: 'user_id',
  created: 'created',
  old: (input: UserEmailChangeData) => {
    const o:EmailChangeConfirmed = {
      email: input.old_email,
      key: input.old_conf_key,
      on: input.old_conf_on,
    };
    return o;
  },
  new: (input: UserEmailChangeData) => {
    const n:EmailChangeConfirmed = {
      email: input.new_email,
      key: input.new_conf_key,
      on: input.new_conf_on,
    };
    return n;
  },
}

export class UserEmailChangeRecord {
  constructor(
    public data: UserEmailChangeData
  ) {}

  public toModel(): UserEmailChange {
    return morphism(UserEmailChangeRecordToModelSchema, this.data);
  }
}