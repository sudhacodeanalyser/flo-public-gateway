import { Expandable, Timestamped, UserAccount, AccountUserRole } from '../api/api';

export interface UserAccountRoleRecordData extends Timestamped {
  user_id: string,
  account_id: string,
  roles: string[]
}

export class UserAccountRoleRecord {
  constructor(
    public data: UserAccountRoleRecordData
  ) {}

  public toUserAccount(): Expandable<UserAccount> {
    return {
     id: this.data.account_id,
     roles: this.data.roles
    };
  }

  public toAccountUserRole(): AccountUserRole {
    return {
      id: this.data.user_id,
      roles: this.data.roles
    };  
  }
}