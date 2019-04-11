import { injectable, inject } from 'inversify';
import AccountTable from './AccountTable'
import Logger from 'bunyan';

@injectable()
class AccountService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('AccountTable') private accountTable: AccountTable
  ) {}

  public async getAccountById(id: string) {
    this.logger.info('Testing 123');

   return this.accountTable.get({ id });
  }
}

export default AccountService;