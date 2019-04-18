import { inject, injectable, interfaces } from 'inversify';
import { Expandable, User, UserAccount, UserLocation, Location, DependencyFactoryFactory } from '../api/api';
import { Resolver, PropertyResolverMap, LocationResolver, AccountResolver } from '../resolver';
import { UserRecord } from './UserRecord';
import { UserDetailRecord } from './UserDetailRecord';
import UserDetailTable from './UserDetailTable';
import UserTable from './UserTable';
import UserLocationRoleTable from './UserLocationRoleTable';
import UserAccountRoleTable from './UserAccountRoleTable';
import { UserAccountRoleRecordData, UserAccountRoleRecord } from './UserAccountRoleRecord';
import { UserLocationRoleRecordData, UserLocationRoleRecord } from './UserLocationRoleRecord';

@injectable()
class UserResolver extends Resolver<User> {
  protected propertyResolverMap: PropertyResolverMap<User> = {
    locations: async (model: User, shouldExpand = false) => {
      const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);

      const userLocations: Array<Expandable<UserLocation>> = userLocationRoleRecordData.map(userLocationRoleRecordDatum =>
        new UserLocationRoleRecord(userLocationRoleRecordDatum).toUserLocation()
      );

      if (!shouldExpand) {
        return userLocations;
      }

      return Promise.all(userLocations.map(
        async (userLocation) => {
          const location = await this.locationResolverFactory().get(userLocation.id);
          return {
            ...userLocation,
            ...(location === null ? {} : location)
          }
        }
      ));
    },
    account: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);
      if (userAccountRoleRecordData === null) {
        return null;
      }

      if (!shouldExpand) {
        return new UserAccountRoleRecord(userAccountRoleRecordData).toUserAccount();
      }

      return this.accountResolverFactory().getAccount(userAccountRoleRecordData.account_id);
    }
  }

  private locationResolverFactory: () => LocationResolver;
  private accountResolverFactory: () => AccountResolver;

  constructor(
    @inject('UserTable') private userTable: UserTable,
    @inject('UserDetailTable') private userDetailTable: UserDetailTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
  }

  public async getUserById(id: string, expandProps: string[] = []): Promise<User | null> {
    const [userRecord, userDetailRecord] = await Promise.all([
      this.userTable.get({ id }),
      this.userDetailTable.get({ user_id: id })
    ]);

    if (userRecord === null || userDetailRecord === null) {
      return null;
    }

    return this.toModel(userRecord, userDetailRecord, expandProps);
  }

  public async removeUser(id: string): Promise<void> {
    // TODO: Make this transactional.
    // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
    await Promise.all([
      this.userLocationRoleTable.remove({ user_id: id }),
      this.userAccountRoleTable.remove({ user_id: id }),
      this.userDetailTable.remove({ user_id: id }),
      this.userTable.remove({ id })
    ]);
  }

  private async toModel(userRecord: UserRecord, userDetailRecord: UserDetailRecord, expandProps: string[]): Promise<User> {
    const user: User = {
      id: userRecord.id,
      email: userRecord.email,
      isActive: userRecord.is_active,
      firstName: userDetailRecord.firstname,
      middleName: userDetailRecord.middlename,
      lastName: userDetailRecord.lastname,
      prefixName: userDetailRecord.prefixname,
      suffixName: userDetailRecord.suffixname,
      unitSystem: userDetailRecord.unit_system,
      phoneMobile: userDetailRecord.phone_mobile,
      locations: [],
      account: {
        id: ''
      }
    }
    const expandedProps = await this.resolveProps(user, expandProps);

    return {
      ...user,
      ...expandedProps
    };
  }
}

export { UserResolver };