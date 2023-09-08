import { inject, injectable, Container } from 'inversify';
import { HttpContext, interfaces } from 'inversify-express-utils';
import { AccountRecordData, AccountRecord } from './AccountRecord';
import Request from '../api/Request';
import { AccountMutable, Account, AccountUserRole, DependencyFactoryFactory, PropExpand, AccountType } from '../api';
import { Resolver, PropertyResolverMap, LocationResolver, UserResolver } from '../resolver';
import AccountTable from './AccountTable';
import UserAccountRoleTable from '../user/UserAccountRoleTable';
import { UserAccountRoleRecord } from '../user/UserAccountRoleRecord';
import { fromPartialRecord } from '../../database/Patch';
import _ from 'lodash';
import { UserInviteService } from '../user/UserRegistrationService';
import Logger from 'bunyan';
import { injectableHttpContext } from '../../cache/InjectableHttpContextUtils';

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
      this.logger.trace({method:'AccountResolver.locations', context: { exists:!!this.httpContext.request, value:this.httpContext.request} });
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
      this.logger.trace({method:'AccountResolver.users', context: { exists:!!this.httpContext.request, value:this.httpContext.request} });
      const currentUserId = req?.token?.user_id;
      const hasPrivilege = await this.hasPrivilege(account.id);
      const accountUserRoles = await this.getAllAccountUserRolesByAccountId(account.id);
      let visibleAccountUserRoles = accountUserRoles
      if (!hasPrivilege){
        const ans = this.getMaxSecurityLevel(accountUserRoles)
        visibleAccountUserRoles = accountUserRoles.filter(({userId }) => (ans[userId].maxLevel ?? 0) <= ans[currentUserId].maxLevel);
      }

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
    },
    pendingInvites: async (account: Account, shouldExpand: boolean = false) => {
      if (!shouldExpand) {
        return null;
      }
      return this.userInviteService.getUserRegistrationTokenMetadataByAccountId(account.id);
    },
  };
  
  private locationResolverFactory: () => LocationResolver;
  private userResolverFactory: () => UserResolver;
  private securityLevel = new Map<string, number>([
    ['owner',     100], 
    ['write',     80],
    ['provision', 50], 
    ['readonly',  10]
  ]); 
  
  constructor(
    @injectableHttpContext private httpContext: interfaces.HttpContext,
    @inject('Logger') private readonly logger: Logger,
    @inject('AccountTable') private accountTable: AccountTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('UserInviteService') private userInviteService: UserInviteService,
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

  public async createAccount(accountId: string, ownerUserId: string, accountType: string): Promise<Account> {
    const createdAccountRecord = await this.accountTable.put({
      id: accountId,
      owner_user_id: ownerUserId,
      type_v2: accountType
    });

    const account = new AccountRecord(createdAccountRecord).toModel();

    return account;
  }

  public getMaxSecurityLevel(accountUserRoles: AccountUserRole[]): _.Dictionary<{userId: string, maxLevel: number}> {
    const ans = _(accountUserRoles)
        .groupBy('userId')
        .map((rs, id) => {
          return {
              userId: id, 
              maxLevel: _(rs)
                  .map('roles')
                  .map((r) =>  this.getMaxSecurityLevelByRoles(r))
                  .max() || 0
            }
          }
        )
        .keyBy('userId')
        .value();
      return ans;
  }

  public getMaxSecurityLevelByRoles(roles: string[]): number {
    const ans = _(roles)
      .map((r: any) => this.securityLevel.get(r) || 0)
      .max() || 0

    return ans;
  }
}

export { AccountResolver };