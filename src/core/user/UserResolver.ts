import { inject, injectable } from 'inversify';
import { DependencyFactoryFactory, User } from '../api/api';
import { Resolver, PropertyResolverMap, LocationResolver, AccountResolver } from '../resolver';
import { fromPartialRecord } from '../../database/Patch';
import { UserRecord } from './UserRecord';
import { UserDetailRecord } from './UserDetailRecord';
import UserDetailTable from './UserDetailTable';
import UserTable from './UserTable';
import UserLocationRoleTable from './UserLocationRoleTable';
import UserAccountRoleTable from './UserAccountRoleTable';
import { UserAccountRoleRecord } from './UserAccountRoleRecord';
import { UserLocationRoleRecordData, UserLocationRoleRecord } from './UserLocationRoleRecord';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';

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
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
  }

  public async updatePartialUser(id: string, partialUser: Partial<User>): Promise<User> {
    const userDetailRecord = this.fromModelToUserDetailRecord(partialUser);
    const patch = fromPartialRecord(userDetailRecord);

    const updatedUserDetailRecord = await this.userDetailTable.update({ user_id: id }, patch);
    const userRecord = await this.userTable.get({ id });

    if (userRecord === null) {
      // This should not happen, unless a user is deleted between the update and retrieval.
      throw new ResourceDoesNotExistError();
    }

    return this.toModel(userRecord, updatedUserDetailRecord);
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

  // TODO: Refactor these methods to use translate (from Location).
  private fromModelToUserDetailRecord(user: Partial<User>): Partial<UserDetailRecord> {
    return {
      firstname: user.firstName,
      middlename: user.middleName,
      lastname: user.lastName,
      prefixname: user.prefixName,
      suffixname: user.suffixName,
      unit_system: user.unitSystem,
      phone_mobile: user.phoneMobile
    };
  }

  private async toModel(userRecord: UserRecord, userDetailRecord: UserDetailRecord, expandProps: string[] = []): Promise<User> {
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
      locationRoles: [],
      accountRole: {
        accountId: '',
        roles: []
      },
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