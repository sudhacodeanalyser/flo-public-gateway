import { inject, injectable, interfaces } from 'inversify';
import { Expandable, LocationUser, UserLocation } from '../api/api';
import { UserLocationRoleRecordData, UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import UserLocationRoleTable from '../user/UserLocationRoleTable';

@injectable()
class LocationUserResolver {
  constructor(
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable
  ) {}

  public async getAllByLocationId(locationId: string, expandProps: string[] = []): Promise<LocationUser[]> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    return Promise.all(
      userLocationRoleRecordData
      .map(userLocationRoleDatum => 
        this.toModel(userLocationRoleDatum, expandProps)
      )
    );
  }

  public async addLocationUser(locationId: string, userId: string, roles: string[]): Promise<LocationUser> {
    const userLocatioRoleRecordData = await this.userLocationRoleTable.put({
      user_id: userId,
      location_id: locationId,
      roles
    });

    return this.toModel(userLocatioRoleRecordData);
  }

  public async removeLocationUser(locationId: string, userId: string): Promise<void> {
    return this.userLocationRoleTable.remove({ user_id: userId, location_id: locationId });
  }

  public async removeAllByLocationId(locationId: string): Promise<void> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    await Promise.all(
      userLocationRoleRecordData
        .map(datum =>
          this.removeLocationUser(datum.user_id, datum.location_id)
        )
    );
  }

  private async toModel(userLocationRoleRecordDatum: UserLocationRoleRecordData, expandProps: string[] = []): Promise<LocationUser> {
    const userLocationRoleRecord = new UserLocationRoleRecord(userLocationRoleRecordDatum);

    return userLocationRoleRecord.toLocationUser();
  }

}

export { LocationUserResolver };