import { injectable, inject } from 'inversify';
import AccountDynamoDBTable from '../../data-access/AccountDynamoDBTable'
import Logger from 'bunyan';

@injectable() 
class AccountService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('AccountDynamoDBTable') private accountDynamoDBTable: AccountDynamoDBTable
  ) {}

  public async getAccountById(id: string) {
    this.logger.info('Testing 123');

    const { Item } = await this.accountDynamoDBTable.get(id)

    return Item;
  }
}

export default AccountService;