import _ from 'lodash';
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
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'email_change');
  }

  // pull the full object using pk id
  public async getById(id:number): Promise<Option<UserEmailChange>> {
    const stmt = `select 
      id,user_id, old_email,old_conf_key,old_conf_on, new_conf_email,new_conf_key,new_conf_on, created 
      from email_change where id=?;`;
    const res = await this.pgDbClient.execute(stmt, [id]);
    return this.firstEmailChangeRow(res);
  }

  // 1) init change: insert a row without confirmation dates, return new id
  public async create(c: UserEmailChangeCreate): Promise<Option<number>> {
    const stmt = 'insert into email_change (user_id, old_email,old_conf_key, new_email,new_conf_key) values(?,?,?,?,?) returning id;';
    const res = await this.pgDbClient.execute(stmt, [c.userId, c.old.email, c.old.key, c.new.email, c.new.key]);
    const maybeData = O.fromNullable(_.first(res.rows));
    return pipe(
      maybeData,
      O.map(data => data.id)
    );
  }

  // 2) confirm an old email as good: return the full object
  public async confirmOld(id:number, key:string): Promise<Option<UserEmailChange>> {
    const stmt = `update email_change set old_key_on=current_timestamp where id=? and old_conf_key=?;
      returning id,user_id, old_email,old_conf_key,old_conf_on, new_conf_email,new_conf_key,new_conf_on, created;`;
    const res = await this.pgDbClient.execute(stmt, [id, key]);
    return this.firstEmailChangeRow(res);
  }

  // 3) confirm the new email a good: return the full object
  public async confirmNew(id:number, key:string): Promise<Option<UserEmailChange>> {
    const stmt = `update email_change set new_key_on=current_timestamp where id=? and new_conf_key=?;
      returning id,user_id, old_email,old_conf_key,old_conf_on, new_conf_email,new_conf_key,new_conf_on, created;`;
    const res = await this.pgDbClient.execute(stmt, [id, key]);
    return this.firstEmailChangeRow(res);
  }

  // helper func to parse the full (table) row response into object
  private async firstEmailChangeRow(res:QueryResult): Promise<Option<UserEmailChange>> {
    const maybeData = O.fromNullable(_.first(res.rows));
    return pipe(
      maybeData,
      O.map(data => new UserEmailChangeRecord(data).toModel())
    );
  }
}

export default UserEmailChangeTable;