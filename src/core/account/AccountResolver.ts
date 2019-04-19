import { inject, injectable, interfaces } from 'inversify';
import { AccountRecordData, AccountRecord } from './AccountRecord';
import { Account, AccountUserRole, DependencyFactoryFactory } from '../api/api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { Resolver, PropertyResolverMap, LocationResolver, UserResolver } from '../resolver';
import AccountTable from './AccountTable';
import UserAccountRoleTable from '../user/UserAccountRoleTable';
import { UserAccountRoleRecord } from '../user/UserAccountRoleRecord';
import { fromPartialRecord } from '../../database/Patch';

@injectable()
class AccountResolver extends Resolver<Account> {
  protected propertyResolverMap: PropertyResolverMap<Account> = {
    owner: async (account: Account, shouldExpand: boolean = false) => {
      if (shouldExpand) {
        return this.userResolverFactory().getUserById(account.owner.id);
      } else {
        return account.owner;
      }
    },
    locations: async (account: Account, shouldExpand: boolean = false) => {
      return this.locationResolverFactory().getAllByAccountId(account.id);
    },
    users: async (account: Account, shouldExpand: boolean = false) => {
      const accountUserRoles = await this.getAllAccountUserRolesByAccountId(account.id);

      if (shouldExpand) {
        return Promise.all(
          accountUserRoles.map(async (accountUserRole) => {
            const user = await this.userResolverFactory().getUserById(accountUserRole.userId);

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

  public async getAccount(id: string, expandProps: string[] = []): Promise<Account | null> {
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