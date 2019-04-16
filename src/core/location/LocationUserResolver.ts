import { inject, injectable, interfaces } from 'inversify';
import { Expandable, LocationUser, UserLocation } from '../api/api';
import { UserLocationRoleRecordData, UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import UserLocationRoleTable from '../user/UserLocationRoleTable';

@injectable()
class LocationUserResolver {
  constructor(
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable
  ) {}

  public async getAllByLocationId(locationId: string, expandProps: string[] = []): Promise<Array<Expandable<LocationUser>>> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    return Promise.all(
      userLocationRoleRecordData
      .map(userLocationRoleDatum => 
        this.toModel(userLocationRoleDatum, expandProps)
      )
    );
  }

  private async toModel(userLocationRoleRecordDatum: UserLocationRoleRecordData, expandProps: string[]): Promise<Expandable<LocationUser>> {
    const userLocationRoleRecord = new UserLocationRoleRecord(userLocationRoleRecordDatum);

    return userLocationRoleRecord.toLocationUser();
  }

}

export { LocationUserResolver };