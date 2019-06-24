import { inject, injectable } from 'inversify';
import { fromPartialRecord } from '../../database/Patch';
import { DependencyFactoryFactory, User } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { AccountResolver, LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import { UserAccountRoleRecord } from './UserAccountRoleRecord';
import UserAccountRoleTable from './UserAccountRoleTable';
import { UserDetailRecord } from './UserDetailRecord';
import UserDetailTable from './UserDetailTable';
import { UserLocationRoleRecord, UserLocationRoleRecordData } from './UserLocationRoleRecord';
import UserLocationRoleTable from './UserLocationRoleTable';
import { UserRecord } from './UserRecord';
import UserTable from './UserTable';

@injectable()
class UserResolver extends Resolver<User> {
  protected propertyResolverMap: PropertyResolverMap<User> = {
    locations: async (model: User, shouldExpand = false) => {
      const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);

      if (!shouldExpand) {
        return userLocationRoleRecordData.map(({ location_id }) => ({ id: location_id }));
      }

      return Promise.all(userLocationRoleRecordData.map(
        async (userLocationRoleRecordDatum) => {
          const location = await this.locationResolverFactory().get(userLocationRoleRecordDatum.location_id);

          return {
            ...location,
            id: userLocationRoleRecordDatum.location_id
          };
        }
      ));
    },
    account: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);
      if (userAccountRoleRecordData === null) {
        return null;
      }

      if (!shouldExpand) {
        return {
          id: userAccountRoleRecordData.account_id
        };
      }

      return this.accountResolverFactory().getAccount(userAccountRoleRecordData.account_id);
    },
    accountRole: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);

      return userAccountRoleRecordData === null ?
        null :
        new UserAccountRoleRecord(userAccountRoleRecordData).toUserAccountRole();
    },
   locationRoles: async (model: User, shouldExpand = false) => {
      const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);

      return userLocationRoleRecordData.map(userLocationRoleRecordDatum =>
        new UserLocationRoleRecord(userLocationRoleRecordDatum).toUserLocationRole()
      );
    }
  }

  private locationResolverFactory: () => LocationResolver;
  private accountResolverFactory: () => AccountResolver;

  constructor(
    @inject('UserTable') private userTable: UserTable,
    @inject('UserDetailTable') private userDetailTable: UserDetailTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('DefaultUserLocale') private defaultUserLocale: string
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
  }

  public async updatePartialUser(id: string, partialUser: Partial<User>): Promise<User> {
    const userDetailRecord = UserDetailRecord.fromModel(partialUser);
    const patch = fromPartialRecord(userDetailRecord);

    const updatedUserDetailRecord = await this.userDetailTable.update({ user_id: id }, patch);
    const userRecord = await this.userTable.get({ id });

    if (userRecord === null) {
      // This should not happen, unless a user is deleted between the update and retrieval.
      throw new ResourceDoesNotExistError();
    }

    return new UserRecord({ ...userRecord, ...updatedUserDetailRecord }).toModel();
  }

  public async getUserById(id: string, expandProps: string[] = []): Promise<User | null> {
    const [userRecord, userDetailRecord] = await Promise.all([
      this.userTable.get({ id }),
      this.userDetailTable.get({ user_id: id })
    ]);

    if (userRecord === null || userDetailRecord === null) {
      return null;
    }

    const user = new UserRecord({
      ...userRecord,
      ...userDetailRecord,
      locale: userDetailRecord.locale || this.defaultUserLocale
    }).toModel();
    const expandedProps = await this.resolveProps(user, expandProps);

    return {
      ...user,
      ...expandedProps
    };
  }

  public async removeUser(id: string): Promise<void> {
    const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(id);
    const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(id);

    // TODO: Make this transactional.
    // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
    await Promise.all([
      ...userLocationRoleRecordData.map(datum =>
        this.userLocationRoleTable.remove({ user_id: id, location_id: datum.location_id }
      )),

      Promise.resolve<false | void>(userAccountRoleRecordData !== null &&
        this.userAccountRoleTable.remove({ user_id: id, account_id: userAccountRoleRecordData.account_id })
      ),

      this.userDetailTable.remove({ user_id: id }),
      this.userTable.remove({ id })
    ]);
  }
}

export { UserResolver };

