import { Timestamped, Account } from '../api/api';

export interface AccountRecordData extends Timestamped {
  id: string,
  owner_user_id: string,
  account_name?: string,
  account_type?: string,
  group_id?: string
}

export class AccountRecord {
  constructor(
    private data: AccountRecordData
  ) {}

  public toModel(): Account {
    return {
      id: this.data.id,
      owner: {
        id: this.data.owner_user_id
      },
      locations: [],
      users: [],
      userRoles: [],
      created_at: this.data.created_at,
      updated_at: this.data.updated_at
    }
  }
}