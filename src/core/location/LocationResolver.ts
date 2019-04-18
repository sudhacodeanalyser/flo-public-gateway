import { inject, injectable, interfaces } from 'inversify';
import { LocationRecordData, LocationRecord } from './LocationRecord';
import { UserLocationRoleRecordData, UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import { Location, LocationUser, DependencyFactoryFactory } from '../api/api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { Resolver,PropertyResolverMap, DeviceResolver, LocationUserResolver, AccountResolver } from '../resolver';
import LocationTable from '../location/LocationTable';
import UserLocationRoleTable from '../user/UserLocationRoleTable';
import { fromPartialRecord } from '../../database/Patch';

@injectable()
class LocationResolver extends Resolver<Location> {
  protected propertyResolverMap: PropertyResolverMap<Location> = {
    devices: async (location: Location, shouldExpand = false) => this.deviceResolverFactory().getAllByLocationId(location.id),
    users: async (location: Location, shouldExpand = false) => {

      // TODO: Need UserResolver
      // if (shouldExpand) {
      //
      // }

      return this.locationUserResolverFactory().getAllByLocationId(location.id)
    },
    account: async (location: Location, shouldExpand = false) => {

      if (!shouldExpand) {
        return location.account;
      }

      return this.accountResolverFactory().getAccount(location.account.id);
    }
  };

  private deviceResolverFactory: () => DeviceResolver;
  private locationUserResolverFactory: () => LocationUserResolver;
  private accountResolverFactory: () => AccountResolver;

  constructor(
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
    this.locationUserResolverFactory = depFactoryFactory<LocationUserResolver>('LocationUserResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
  }

  public async get(id: string, expandProps: string[] = []): Promise<Location | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(id);

    if (locationRecordData === null) {
      return null;
    }

    const location = new LocationRecord(locationRecordData).toModel();
    const resolvedProps = await this.resolveProps(location, expandProps);

    return {
      ...location,
      ...resolvedProps
    };
  }

  public async createLocation(location: Location): Promise<Location> {
    const locationRecordData = LocationRecord.fromModel(location);
    const createdLocationRecordData = await this.locationTable.put(locationRecordData);

    return new LocationRecord(createdLocationRecordData).toModel();
  }

  public async updatePartialLocation(id: string, location: Partial<Location>): Promise<Location> {
    const locationRecordData = LocationRecord.fromPartialModel(location);
    const patch = fromPartialRecord<Location>(locationRecordData);
    const accountId: string | null = await this.getAccountId(id);

    if (accountId === null) {
      throw new ResourceDoesNotExistError();
    }

    const updatedLocationRecordData = await this.locationTable.update({ account_id: accountId, location_id: id }, patch);

    return new LocationRecord(updatedLocationRecordData).toModel();
  }

  public async removeLocation(id: string): Promise<void> {
    const accountId: string | null = await this.getAccountId(id);

    if (accountId !== null) {
      await Promise.all([
        this.locationTable.remove({ acount_id: accountId, location_id: id }),
        this.locationUserResolverFactory().removeAllByLocationId(id)
      ]);
    }
  }

  public async getAllByAccountId(accountId: string): Promise<Location[]> {
    const locationRecordData = await this.locationTable.getAllByAccountId(accountId);

    return locationRecordData.map(datum => new LocationRecord(datum).toModel());
  }

  public async getAllLocationUsersByLocationId(locationId: string, expandProps: string[] = []): Promise<LocationUser[]> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    return Promise.all(
      userLocationRoleRecordData
      .map(userLocationRoleDatum => 
        new UserLocationRoleRecord(userLocationRoleDatum).toLocationUser()
      )
    );
  }

  public async addLocationUser(locationId: string, userId: string, roles: string[]): Promise<LocationUser> {
    const userLocatioRoleRecordData = await this.userLocationRoleTable.put({
      user_id: userId,
      location_id: locationId,
      roles
    });

    return new UserLocationRoleRecord(userLocatioRoleRecordData).toLocationUser();
  }

  public async removeLocationUser(locationId: string, userId: string): Promise<void> {
    return this.userLocationRoleTable.remove({ user_id: userId, location_id: locationId });
  }

  public async removeAllByLocationId(locationId: string): Promise<void> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    // TODO use transaction in the future
    await Promise.all(
      userLocationRoleRecordData
        .map(datum =>
          this.removeLocationUser(datum.user_id, datum.location_id)
        )
    );
  }

  // The DynamoDB Location table has account_id as a hash key on the primary
  // table. The location_id is only a hash key on a Global Second Index on the
  // table, and writes are not permitted against indices in Dynamo.
  // Therefore we must retrieve the account_id before doing any writes where we only
  // have the location_id previously known.
  private async getAccountId(locationId: string): Promise<string | null> {
    const locationRecordData: LocationRecordData | null = await this.locationTable.getByLocationId(locationId);

    return locationRecordData === null ? null : locationRecordData.account_id;
  }

}

export { LocationResolver };