import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import AccountRecord from './AccountRecord';

@injectable()
class AccountTable extends DatabaseTable<AccountRecord> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'Account');
  }
}

export default AccountTable;
