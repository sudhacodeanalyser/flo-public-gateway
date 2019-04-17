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
          const location: Location | null = await this.locationResolverFactory().get(userLocation.id);
          return {
            ...userLocation,
            ...(location === null ? {} : location)
          }
        }
      ));
    },
    account: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData: UserAccountRoleRecordData | null = await this.userAccountRoleTable.getByUserId(model.id);
      if (userAccountRoleRecordData === null) {
        return null;
      }

      if (!shouldExpand) {
        const userAccount: Expandable<UserAccount> = new UserAccountRoleRecord(userAccountRoleRecordData).toUserAccount();
        return userAccount;
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

  public async get(id: string, expandProps: string[] = []): Promise<User | null> {
    const [userRecord, userDetailRecord]: [UserRecord | null, UserDetailRecord | null] =
      await Promise.all([
        this.userTable.get({ id }),
        this.userDetailTable.get({ user_id: id })
      ]);

    if (userRecord === null || userDetailRecord === null) {
      return null;
    }

    return this.toModel(userRecord, userDetailRecord, expandProps);
  }

  private async toModel(userRecord: UserRecord, userDetailRecord: UserDetailRecord, expandProps: string[]): Promise<User> {
    const userDetail = (({ user_id, ...rest }) => rest)(userDetailRecord);
    const basicUserRecord = (({ password, email_hash, source, ...rest }) => rest)(userRecord);
    const user: User = {
      ...basicUserRecord,
      ...userDetail,
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