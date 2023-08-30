import * as _ from 'lodash';
import { inject, injectable, targetName } from 'inversify';
import * as O from 'fp-ts/lib/Option';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { UserEmailChangeData, UserEmailChangeRecord } from './UserEmailChangeRecord';
import { UserEmailChange, UserEmailChangeCreate } from '../api';
import { pipe } from 'fp-ts/lib/pipeable';
import { QueryResult } from 'pg';

type Option<T> = O.Option<T>;

@injectable()
class UserEmailChangeTable extends PostgresTable<UserEmailChangeData> {
  // ensure static ordering in case new columns are added to the middle of the table on accident
  private static readonly allColumns:string = 'id, user_id, old_email, old_conf_key, old_conf_on, new_email, new_conf_key, new_conf_on, created';

  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'email_change');
  }

  // pull the full object using pk id
  public async getById(id:number): Promise<Option<UserEmailChange>> {
    const stmt = `select ${UserEmailChangeTable.allColumns} from email_change where id=$1;`;
    const res = await this.pgDbClient.execute(stmt, [id]);
    return this.firstEmailChangeRow(res);
  }

  // 1) init change: insert a row without confirmation dates, return full object
  public async create(c: UserEmailChangeCreate): Promise<Option<UserEmailChange>> {
    const stmt = `insert into email_change (user_id, old_email, old_conf_key, new_email, new_conf_key) 
      values($1, $2, uuid_generate_v4(), $3, uuid_generate_v4())
      returning ${UserEmailChangeTable.allColumns};`;
    const res = await this.pgDbClient.execute(stmt, [c.userId, c.old.email, c.new.email]);
    return this.firstEmailChangeRow(res);
  }

  // 2) confirm an old email as good: return the full object
  public async confirmOld(id: number, key: string, userId: string): Promise<Option<UserEmailChange>> {
    const stmt = `update email_change set old_conf_on=current_timestamp 
      where id=$1 and old_conf_key=$2 and old_conf_on is null and user_id=$3
      returning ${UserEmailChangeTable.allColumns};`;
    const res = await this.pgDbClient.execute(stmt, [id, key, userId]);
    return this.firstEmailChangeRow(res);
  }

  // 3) confirm the new email a good: return the full object
  public async confirmNew(id: number, key: string, userId: string): Promise<Option<UserEmailChange>> {
    const stmt = `update email_change set new_conf_on=current_timestamp 
      where id=$1 and new_conf_key=$2 and new_conf_on is null and user_id=$3
      returning ${UserEmailChangeTable.allColumns};`;
    const res = await this.pgDbClient.execute(stmt, [id, key, userId]);
    return this.firstEmailChangeRow(res);
  }

  // helper func to parse allColumns row response into object
  private async firstEmailChangeRow(res:QueryResult): Promise<Option<UserEmailChange>> {
    const maybeData = O.fromNullable(_.first(res.rows));
    return pipe(
      maybeData,
      O.map(data => new UserEmailChangeRecord(data).toModel())
    );
  }
}

export default UserEmailChangeTable;