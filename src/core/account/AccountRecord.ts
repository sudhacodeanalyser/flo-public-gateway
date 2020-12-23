import { Account, Timestamped } from '../api';

export interface AccountRecordData extends Timestamped {
  id: string;
  owner_user_id: string;
  account_name?: string; // Unused legacy
  account_type?: string; // Unused legacy 
  group_id?: string;
  type_v2?: string; // For personal vs MUD accounts
}

export class AccountRecord {
  
  public static fromPartialModel(model: Partial<Account>): Partial<AccountRecordData> {
    return {
      id: model.id,
      owner_user_id: model.owner && model.owner.id,
      group_id: model.groups && model.groups.length ? model.groups[0].id : undefined,
      type_v2: model.type
    };
  }

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
      createdAt: this.data.created_at,
      updatedAt: this.data.updated_at,
      groups: this.data.group_id ? [{ id: this.data.group_id }] : [],
      type: this.data.type_v2 || 'personal',
      pendingInvites: undefined,
    }
  }
}