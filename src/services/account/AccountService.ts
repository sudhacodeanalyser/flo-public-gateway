import { injectable, inject } from 'inversify';
import AccountDAO from './AccountDAO'
import Logger from 'bunyan';

@injectable() 
class AccountService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('AccountDAO') private accountDAO: AccountDAO
  ) {
    this.logger = logger;
    this.accountDAO = accountDAO;
  }

  public async getAccountById(id: string) {
    this.logger.info('Testing 123');

    const { Item } = await this.accountDAO.get(id)

    return Item;
  }
}

export default AccountService;