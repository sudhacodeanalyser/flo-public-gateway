import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import { AccountRecordData, AccountRecord } from './AccountRecord';
import Request from '../api/Request';
import {
  AccountMutable,
  Account,
  AccountUserRole,
  DependencyFactoryFactory,
  PropExpand,
  AccountType,
  PropSelectRestIntersection,
} from '../api';
import { Resolver, PropertyResolverMap, LocationResolver, UserResolver } from '../resolver';
import AccountTable from './AccountTable';
import UserAccountRoleTable from '../user/UserAccountRoleTable';
import { UserAccountRoleRecord } from '../user/UserAccountRoleRecord';
import { fromPartialRecord } from '../../database/Patch';
import _ from 'lodash';

@injectable()
class AccountResolver extends Resolver<Account> {
  protected propertyResolverMap: PropertyResolverMap<Account> = {
    owner: async (account: Account, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      const hasPrivilege = await this.hasPrivilege(account.id);

      if (!hasPrivilege) {
        return { id: '' };
      } else if (shouldExpand && account?.owner?.id) {
        return this.userResolverFactory().getUserById(account.owner.id, expandProps);
      } else {
        return account.owner;
      }
    },
    locations: async (account: Account, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      if (account.type === AccountType.ENTERPRISE) {
        return null;
      }
      const hasPrivilege = await this.hasPrivilege(account.id);
      const req = this.httpContext.request as Request;
      const currentUserId = req?.token?.user_id;
      const locations = hasPrivilege ?
        (await this.locationResolverFactory().getAllByAccountId(account.id, expandProps)) :
        currentUserId ? 
          (await this.locationResolverFactory().getByUserIdRootOnly(currentUserId, expandProps)).items :
          [];

      return locations.filter(({ parent }) => !parent);
    },
    users: async (account: Account, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      const req = this.httpContext.request as Request;
      const currentUserId = req?.token?.user_id;
      const hasPrivilege = await this.hasPrivilege(account.id);
      const accountUserRoles = await this.getAllAccountUserRolesByAccountId(account.id);
      const visibleAccountUserRoles = hasPrivilege ?
        accountUserRoles :
        _.filter(accountUserRoles, ({ userId: currentUserId }));

      if (shouldExpand) {
        return Promise.all(
          visibleAccountUserRoles.map(async (accountUserRole) => {
            const user = await this.userResolverFactory().getUserById(accountUserRole.userId, expandProps);

            return {
              ...user,
              id: accountUserRole.userId
            };
          })
        );
      } else {
        return visibleAccountUserRoles.map(({ userId }) => ({ id: userId }));
      }
    },
    userRoles: async (account: Account, shouldExpand: boolean = false) => {
      if (account.type === AccountType.ENTERPRISE && !shouldExpand) {
        return null;
      }
      const req = this.httpContext.request as Request;
      const currentUserId = req?.token?.user_id;
      const hasPrivilege = await this.hasPrivilege(account.id);
      const userAccountRoles = await this.getAllAccountUserRolesByAccountId(account.id);

      return hasPrivilege ?
        userAccountRoles :
        _.filter(userAccountRoles, { userId: currentUserId });
    },
    type: async (account: Account, shouldExpand: boolean = false) => {
      return account.type || 'personal';
    }
  };
  private locationResolverFactory: () => LocationResolver;
  private userResolverFactory: () => UserResolver;

  constructor(
    @inject('AccountTable') private accountTable: AccountTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
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

  public async updatePartial(id: string, accountUpdate: AccountMutable): Promise<Account> {
    const accountRecordData = AccountRecord.fromPartialModel(accountUpdate);
    const patch = fromPartialRecord(accountRecordData);
    const updatedAccountRecordData = await this.accountTable.update({ id }, patch);

    return new AccountRecord(updatedAccountRecordData).toModel();
  }

  public async hasPrivilege(accountId: string): Promise<boolean> {
    const req = this.httpContext.request as Request;
    const currentUserRoles = req?.token?.roles;
    const currentUserId = req?.token?.user_id;
    const currentClientId = req?.token?.client_id;
    const accountUserRoles = await this.getAllAccountUserRolesByAccountId(accountId);
    
    return currentUserRoles && (
      req?.token?.isAdmin() || // Is Flo system admin
      (currentUserId && !_.chain(accountUserRoles)
        .filter({ userId: currentUserId })
        .map('roles')
        .flatten()
        .intersection(['owner', 'write'])
        .isEmpty()
        .value()
      ) || // Has owner or write permissions on account
      (!currentUserId && currentClientId) // Is a client (i.e. non-user) token
    );
  }
}

export { AccountResolver };