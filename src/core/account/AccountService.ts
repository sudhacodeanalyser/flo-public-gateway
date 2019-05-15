import { injectable, inject } from 'inversify';
import { Account, AccountUserRole } from '../api';
import { AccountResolver } from '../resolver';

@injectable()
class AccountService {
  constructor(
    @inject('AccountResolver') private accountResolver: AccountResolver
  ) {}

  public async getAccountById(id: string, expandProps?: string[]): Promise<Account | {}> {
    const account: Account | null = await this.accountResolver.getAccount(id, expandProps);

    return account === null ? {} : account;
  }

  public async removeAccount(id: string): Promise<void> {

    return this.accountResolver.removeAccount(id);
  }

  public async updateAccountUserRole(id: string, userId: string, roles: string[]): Promise<AccountUserRole> {

    return this.accountResolver.updateAccountUserRole(id, userId, roles);
  }

  public async getAccountByOwnerUserId(ownerUserId: string): Promise<Account | {}> {
    const account = await this.accountResolver.getAccountByOwnerUserId(ownerUserId);
    return account === null ? {} : account;
  }
}

export default AccountService;