import Logger from 'bunyan';
import { injectable, inject } from 'inversify';
import { Account } from '../api/api';
import { AccountResolver } from '../resolver';

@injectable()
class AccountService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('AccountResolver') private accountResolver: AccountResolver
  ) {}

  // TODO
  // public async getAccountById(id: string) {
  //   this.logger.info('Testing 123');

  //  return this.accountTable.get({ id });
  // }

  public async getAccountByOwnerUserId(ownerUserId: string): Promise<Account | {}> {
    const account = await this.accountResolver.getAccountByOwnerUserId(ownerUserId);
    return account === null ? {} : account;
  }
}

export default AccountService;