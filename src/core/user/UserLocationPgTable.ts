import { inject, injectable, targetName } from 'inversify';
import squel from 'safe-squel';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';

@injectable()
class UserLocationPgTable extends PostgresTable<any> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'user_location');
  }

  public async getByUserId(userId: string, size: number = 20, page: number = 1): Promise<any> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .from('"user_location"')
      .field('"user_id"')
      .field('"location_id"')
      .field('"roles"')
      .field('COUNT("user_id") OVER()', '"total"')
      .where('"user_id" = ?', userId)
      .limit(Math.max(1, size))
      .offset(Math.max(0, page - 1))
      .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? results.rows[0].total : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);

    return {
      page,
      total,
      items
    };
  }

  public async getByLocationId(locationId: string, size: number = 20, page: number = 1): Promise<any> {
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .from('"user_location"')
      .field('"user_id"')
      .field('"location_id"')
      .field('"roles"')
      .field('COUNT("location_id") OVER()', '"total"')
      .where('"location_id" = ?', locationId)
      .limit(Math.max(1, size))
      .offset(Math.max(0, page - 1))
      .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? results.rows[0].total : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);

    return {
      page,
      total,
      items
    };
  }
}

export default UserLocationPgTable;