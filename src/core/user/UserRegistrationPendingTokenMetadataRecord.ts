import { UserRegistrationPendingTokenMetadata } from "../api";
import { UserRegistrationTokenMetadataRecordData } from "./UserRegistrationTokenMetadataRecord";

export class UserRegistrationPendingTokenMetadataRecord {

  constructor(
    private data: UserRegistrationTokenMetadataRecordData
  ) {}

  public toModel(): UserRegistrationPendingTokenMetadata {
    return {
      email: this.data.email,
      accountId: this.data.account_id,
      tokenExpiresAt: this.data.token_expires_at,
      registrationDataExpiresAt: this.data.registration_data_expires_at,
      createdAt: this.data.created_at,
    };
  }
}
