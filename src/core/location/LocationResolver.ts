import { inject, injectable } from 'inversify';
import uuid from 'uuid';
import { LocationRecordData, LocationRecord } from './LocationRecord';
import { UserLocationRoleRecord } from '../user/UserLocationRoleRecord';
import { Location, LocationUserRole, DependencyFactoryFactory } from '../api/api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { Resolver,PropertyResolverMap, DeviceResolver, UserResolver, AccountResolver } from '../resolver';
import LocationTable from '../location/LocationTable';
import UserLocationRoleTable from '../user/UserLocationRoleTable';
import { fromPartialRecord } from '../../database/Patch';

@injectable()
class LocationResolver extends Resolver<Location> {
  protected propertyResolverMap: PropertyResolverMap<Location> = {
    devices: async (location: Location, shouldExpand = false) => this.deviceResolverFactory().getAllByLocationId(location.id),
    users: async (location: Location, shouldExpand = false) => {
      const locationUserRoles = await this.getAllUserRolesByLocationId(location.id);

      if (shouldExpand) {
        return Promise.all(
          locationUserRoles.map(async (locationUserRole) => {
            const user = await this.userResolverFactory().getUserById(locationUserRole.userId);

            return {
              ...user,
              id: locationUserRole.userId
            };
          })
        );
      } else {
        return locationUserRoles.map(({ userId }) => ({ id: userId }));
      }
    },
    userRoles: async (location: Location, shouldExpand = false) => {
      return this.getAllUserRolesByLocationId(location.id);
    },
    account: async (location: Location, shouldExpand = false) => {

      if (!shouldExpand) {
        return location.account;
      }

      return this.accountResolverFactory().getAccount(location.account.id);
    }
  };

  private deviceResolverFactory: () => DeviceResolver;
  private accountResolverFactory: () => AccountResolver;
  private userResolverFactory: () => UserResolver;

  constructor(
    @inject('LocationTable') private locationTable: LocationTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
    this.userResolverFactory = depFactoryFactory<UserResolver>('UserResolver');
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

  public async createLocation(location: Location): Promise<Location | null> {
    const locationRecordData = LocationRecord.fromModel(location);
    const locationId = locationRecordData.location_id = uuid.v4();

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
      // TODO: Make this transactional.
      // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
      await Promise.all([
        this.locationTable.remove({ account_id: accountId, location_id: id }),
        this.removeLocationUsersAllByLocationId(id),
        ...(await this.deviceResolverFactory().getAllByLocationId(id))
          .map(async ({ id: icdId }) => this.deviceResolverFactory().remove(icdId))
      ]);
    } else {
      throw new ResourceDoesNotExistError();
    }
  }

  public async getAllByAccountId(accountId: string): Promise<Location[]> {
    const locationRecordData = await this.locationTable.getAllByAccountId(accountId);

    return Promise.all(
      locationRecordData
        .map(async (datum) => {
          const location = new LocationRecord(datum).toModel();
          const resolvedProps = await this.resolveProps(location);

          return {
            ...location,
            ...resolvedProps
          };
        })
    );
  }

  public async getAllUserRolesByLocationId(locationId: string): Promise<LocationUserRole[]> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    return Promise.all(
      userLocationRoleRecordData
        .map(userLocationRoleDatum =>
          new UserLocationRoleRecord(userLocationRoleDatum).toLocationUserRole()
        )
    );
  }

  public async addLocationUserRole(locationId: string, userId: string, roles: string[]): Promise<LocationUserRole> {
    const [user, location] = await Promise.all([
      this.userResolverFactory().getUserById(userId),
      this.get(locationId),
    ]);


    if (user === null || location === null) {
      throw new ResourceDoesNotExistError();
    }

    const userLocatioRoleRecordData = {
      user_id: userId,
      location_id: locationId,
      roles
    };
    const createdUserLocatioRoleRecordData = await this.userLocationRoleTable.put(userLocatioRoleRecordData);

    return new UserLocationRoleRecord(createdUserLocatioRoleRecordData).toLocationUserRole();
  }

  public async removeLocationUserRole(locationId: string, userId: string): Promise<void> {
    return this.userLocationRoleTable.remove({ user_id: userId, location_id: locationId });
  }

  public async removeLocationUsersAllByLocationId(locationId: string): Promise<void> {
    const userLocationRoleRecordData = await this.userLocationRoleTable.getAllByLocationId(locationId);

    // TODO: Make this transactional.
    // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
    await Promise.all(
      userLocationRoleRecordData
        .map(datum =>
          this.removeLocationUserRole(datum.user_id, datum.location_id)
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