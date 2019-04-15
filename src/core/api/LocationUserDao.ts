import { inject, injectable, interfaces } from 'inversify';
import { ObjectExpander, Expandable, LocationUser, UserLocation } from './api';
import { UserLocationRoleRecordData, UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import UserLocationRoleTable from '../user/UserLocationRoleTable';

class LocationUserDao extends ObjectExpander<UserLocationRoleRecord, LocationUser> {
  constructor(
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable
  ) {
    super({
      user: async (userLocationRoleRecord: UserLocationRoleRecord): Promise<Partial<LocationUser>> => {
        // TODO
        return {};
      }
    });
  }

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
    const expandedProps = await this.expandProps(userLocationRoleRecord, expandProps);

    return {
      ...userLocationRoleRecord.toLocationUser(),
      ...expandedProps
    };
  }

}

export { LocationUserDao };