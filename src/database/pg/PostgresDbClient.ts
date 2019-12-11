import { inject, injectable } from 'inversify';
import _ from 'lodash';
import postgres from 'pg';
import squel from 'squel';
import { DatabaseReadClient, KeyMap } from '../DatabaseClient';

export type PostgresQuery = { query?: squel.PostgresSelect }

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
    const result = await this._executeQuery(text, values);

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
    const result = await this._executeQuery(text, values);

    return result.rows;
  }

  private async _executeQuery(query: string, values: any[]): Promise<postgres.QueryResult> {

    return this.postgresPool.query(query, values);
  }
}

export { PostgresDbClient };

