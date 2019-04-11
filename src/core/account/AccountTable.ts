import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import Config from '../../config/config';
import AccountRecord from './AccountRecord';

@injectable()
class AccountTable extends DatabaseTable<AccountRecord> {
  constructor(
    @inject('DatabaseClient') dbClient: DatabaseClient,
    @inject('Config') config: typeof Config
  ) {
    super(dbClient, config.dynamoTablePrefix + 'Account');
  }
}

export default AccountTable;