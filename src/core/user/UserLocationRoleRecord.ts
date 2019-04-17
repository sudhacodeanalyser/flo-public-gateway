import { Expandable, UserLocation, LocationUser } from '../api/api';

export interface UserLocationRoleRecordData {
  user_id: string,
  location_id: string,
  roles: string[],
  created_at?: string,
  updated_at?: string
}

export class UserLocationRoleRecord {
  constructor(
    public data: UserLocationRoleRecordData
  ) {}

  public toUserLocation(): Expandable<UserLocation> {
    return {
     id: this.data.location_id,
     roles: this.data.roles
    };
  }

  public toLocationUser(): LocationUser {
    return {
      id: this.data.user_id,
      roles: this.data.roles
    };
  }
}