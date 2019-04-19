import { Expandable, UserLocation, LocationUserRole, Timestamped } from '../api/api';

export interface UserLocationRoleRecordData extends Timestamped {
  user_id: string,
  location_id: string,
  roles: string[]
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

  public toLocationUserRole(): LocationUserRole {
    return {
      id: this.data.user_id,
      roles: this.data.roles
    };
  }
}