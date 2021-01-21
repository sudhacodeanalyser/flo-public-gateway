import { UserRegistrationTokenMetadata } from '../api';

export interface UserRegistrationTokenMetadataRecordData {
  token_id: string;
  email: string;
  created_at?: string;
  token_expires_at?: string;
  _registration_data_expires_at_secs?: number;
  registration_data_expires_at?: string;
  registration_data: any;
  account_id?: string;
  support_emails?: string[];
}

export class UserRegistrationTokenMetadataRecord {

  constructor(
    private data: UserRegistrationTokenMetadataRecordData
  ) {}

  public toModel(): UserRegistrationTokenMetadata {
    return {
      email: this.data.email,
      createdAt: this.data.created_at,
      tokenExpiresAt: this.data.token_expires_at,
      registrationDataExpiresAt: this.data.registration_data_expires_at,
      registrationData: {
        locale: this.data.registration_data?.locale,
        userAccountRole: this.data.registration_data?.userAccountRole,
        userLocationRoles: this.data.registration_data?.userLocationRoles,
      },
      accountId: this.data.account_id,
      supportEmails: this.data.support_emails,
    }
  }
}
