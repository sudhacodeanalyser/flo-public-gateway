import { inject, injectable } from 'inversify';
import { AccountRecordData, AccountRecord } from './AccountRecord';
import { Account, AccountUserRole, DependencyFactoryFactory, PropExpand } from '../api';
import { Resolver, PropertyResolverMap, LocationResolver, UserResolver } from '../resolver';
import AccountTable from './AccountTable';
import UserAccountRoleTable from '../user/UserAccountRoleTable';
import { UserAccountRoleRecord } from '../user/UserAccountRoleRecord';
import { fromPartialRecord } from '../../database/Patch';

@injectable()
class AccountResolver extends Resolver<Account> {
  protected propertyResolverMap: PropertyResolverMap<Account> = {
    owner: async (account: Account, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      if (shouldExpand) {
        return this.userResolverFactory().getUserById(account.owner.id, expandProps);
      } else {
        return account.owner;
      }
    },
    locations: async (account: Account, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      const locations = await this.locationResolverFactory().getAllByAccountId(account.id, expandProps);

      return locations.filter(({ parent }) => !parent);
    },
    users: async (account: Account, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      const accountUserRoles = await this.getAllAccountUserRolesByAccountId(account.id);

      if (shouldExpand) {
        return Promise.all(
          accountUserRoles.map(async (accountUserRole) => {
            const user = await this.userResolverFactory().getUserById(accountUserRole.userId, expandProps);

            return {
              ...user,
              id: accountUserRole.userId
            };
          })
        );
      } else {
        return accountUserRoles.map(({ userId }) => ({ id: userId }));
      }
    },
    userRoles: async (account: Account, shouldExpand: boolean = false) => {
      return this.getAllAccountUserRolesByAccountId(account.id);
    }
  };
  private locationResolverFactory: () => LocationResolver;
  private userResolverFactory: () => UserResolver;

  constructor(
    @inject('AccountTable') private accountTable: AccountTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
    this.userResolverFactory = depFactoryFactory<UserResolver>('UserResolver');
  }

  public async getAccount(id: string, expandProps?: PropExpand): Promise<Account | null> {
    const accountRecordData: AccountRecordData | null = await this.accountTable.get({ id });

    if (accountRecordData === null) {
      return null;
    }

    const account = new AccountRecord(accountRecordData).toModel();
    const resolvedProps = await this.resolveProps(account, expandProps);

    return {
      ...account,
      ...resolvedProps
    };
  }

  public async removeAccount(id: string): Promise<void> {
    const account = await this.getAccount(id);

    if (account !== null) {
      // TODO: Make this transactional.
      // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
      await Promise.all([
        this.accountTable.remove({ id }),
        ...account.userRoles.map(async ({ userId }) =>
          this.userAccountRoleTable.remove({ account_id: id, user_id: userId })
        ),
        ...account.locations.map(async ({ id: locationId }) =>
          this.locationResolverFactory().removeLocation(locationId)
        )
      ]);

      await Promise.all(
        account.users.map(async ({ id: userId }) =>
          this.userResolverFactory().removeUser(userId)
        )
      );
    }
  }

  public async updateAccountUserRole(accountId: string, userId: string, roles: string[]): Promise<AccountUserRole> {
    const upsertedUserAccountRoleRecordData = await this.userAccountRoleTable.put({ account_id: accountId, user_id: userId, roles });

    return new UserAccountRoleRecord(upsertedUserAccountRoleRecordData).toAccountUserRole();
  }

  public async getAccountByOwnerUserId(ownerUserId: string): Promise<Account | null> {
    const accountRecordData = await this.accountTable.getByOwnerUserId(ownerUserId);

    if (accountRecordData === null) {
      return null;
    }

    return new AccountRecord(accountRecordData).toModel();
  }

  public async getAllAccountUserRolesByAccountId(accountId: string): Promise<AccountUserRole[]> {
    const userAccountRoleRecordData = await this.userAccountRoleTable.getAllByAccountId(accountId);

    return Promise.all(
      userAccountRoleRecordData
        .map(userAccountRoleRecordDatum =>
          new UserAccountRoleRecord(userAccountRoleRecordDatum).toAccountUserRole()
        )
    );
  }
}

export { AccountResolver };