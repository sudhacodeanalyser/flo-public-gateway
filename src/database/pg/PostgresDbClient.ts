import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as postgres from 'pg';
import squel from 'safe-squel';
import { DatabaseReadClient, KeyMap } from '../DatabaseClient';

export type PostgresQuery = { query?: squel.PostgresSelect }
export type PostgresStatement = { text: string, values?: any[] };
@injectable()
class PostgresDbClient implements DatabaseReadClient {

  constructor(
    @inject('PostgresPool') private postgresPool: postgres.Pool
  ) {}

  public async get<T>(tableName: string, key: KeyMap, projection: string[] = []): Promise<T | null> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .fields(projection)
      .from(tableName)
      .where(
        _.reduce(
          key,
          (acc: squel.Expression, v: any, k: string) =>
            acc.and(`${ k } = ?`, v),
          squel.expr()
        )
      )
      .toParam();
    const result = await this.execute(text, values);

    return (result.rows.length && result.rows[0]) || null;
  }

  public async batchGet<T>(tableName: string, keys: KeyMap[]): Promise<Array<T | null>> {
    // TODO: Implement real batch retrieval from Postgres
    return Promise.all(
      keys.map(key => this.get<T>(tableName, key))
    );
  }

  public async query<T>(tableName: string, { query }: PostgresQuery): Promise<T[]> {

    if (!query) {
      return [];
    }

    const { text, values } = query.from(tableName).toParam();
    const result = await this.execute(text, values);

    return result.rows;
  }

  public async execute(query: string, values: any[]): Promise<postgres.QueryResult> {
    return this.postgresPool.query(query, values);
  }

  public async executeTransaction(statements: PostgresStatement[]): Promise<void> {
    const conn = await this.postgresPool.connect();

    try {
      await conn.query('BEGIN');

      for (const { text, values } of statements) {
        await conn.query(text, values)
      }

      await conn.query('COMMIT');

    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  }
}

export { PostgresDbClient };

