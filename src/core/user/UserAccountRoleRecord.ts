import { Timestamped, UserAccountRole, AccountUserRole } from '../api';

export interface UserAccountRoleRecordData extends Timestamped {
  user_id: string,
  account_id: string,
  roles: string[]
}

export class UserAccountRoleRecord {
  constructor(
    public data: UserAccountRoleRecordData
  ) {}

  public toUserAccountRole(): UserAccountRole {
    return {
     accountId: this.data.account_id,
     roles: this.data.roles
    };
  }

  public toAccountUserRole(): AccountUserRole {
    return {
      userId: this.data.user_id,
      roles: this.data.roles
    };
  }
}