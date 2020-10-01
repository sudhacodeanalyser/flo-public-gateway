import { inject, injectable, targetName } from 'inversify';
import squel from 'squel';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { LocationPgRecordData, LocationPgPage, LocationFacetPgPage } from './LocationPgRecord';
import _ from 'lodash';
import { LocationFilters } from '../api';

@injectable()
class LocationPgTable extends PostgresTable<LocationPgRecordData> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'location');
  }

  public async getByAccountId(accountId: string, size: number = 100, page: number = 1): Promise<LocationPgPage> {
    const limit = Math.max(1, size);
    const { text, values } = squel.useFlavour('postgres')
      .select()
      .field('*')
      .field('COUNT(*) OVER()', '"total"')
      .from('"location"')
      .where('"account_id" = ?', accountId)
      .limit(limit)
      .offset(limit * Math.max(0, page - 1))
      .group('"id"')
      .toParam()
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? parseInt(results.rows[0].total, 10) : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);

    return {
      page,
      total,
      items
    };
  }

  public async getByUserIdRootOnly(userId: string, size: number = 100, page: number = 1, filters: LocationFilters = {}, searchText: string = ''): Promise<LocationPgPage> {
    const limit = Math.max(1, size);
    const queryBuilder = this.applyFilters(
      squel.useFlavour('postgres')
        .select()
        .field('"l".*')
        .field('COUNT(*) OVER()', '"total"')
        .from('"user_location"', '"ul"')
        .join('"location"', '"l"', '"ul"."location_id" = "l"."id"')
        .where(`
          NOT EXISTS(
            SELECT 1 FROM "user_location" AS "ul"
            JOIN "location" as "ll" on "ul"."location_id" = "ll"."id"
            WHERE "ul"."user_id" = ?
            AND "l"."parent_location_id" = "ll"."id"
          )
        `, userId)
        .where('"ul"."user_id" = ?', userId),
      filters
    );
    const { text, values } = (
      searchText.trim() ?
        queryBuilder
          .where(
            'to_tsvector(\'simple\', f_concat_ws(\' \', "address", "address2", "city", "state", "postal_code", "country", "nickname")) @@ to_tsquery(\'simple\', ?)',
            this.getQueryTerms(searchText)
          ) :
        queryBuilder
    )
    .order('"l"."id"')
    .limit(limit)
    .offset(limit * Math.max(0, page - 1))
    .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? parseInt(results.rows[0].total, 10) : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);

    return {
      page,
      total,
      items
    };
  }

  public async getByUserId(userId: string, size: number = 100, page: number = 1, filters: LocationFilters = {}, searchText: string = ''): Promise<LocationPgPage> {
    const limit = Math.max(1, size);
    const queryBuilder = this.applyFilters(
      squel.useFlavour('postgres')
        .select()
        .field('"l".*')
        .field('COUNT(*) OVER()', '"total"')
        .from('"user_location"', '"ul"')
        .join('"location"', '"l"', '"ul"."location_id" = "l"."id"')
        .where('"ul"."user_id" = ?', userId),
      filters
    );
    const { text, values } = (
        searchText.trim() ?
          queryBuilder
            .where(
              'to_tsvector(\'simple\', f_concat_ws(\' \', "address", "address2", "city", "state", "postal_code", "country", "nickname")) @@ to_tsquery(\'simple\', ?)',
              this.getQueryTerms(searchText)
            ) :
          queryBuilder
      )
      .order('"l"."id"')
      .limit(limit)
      .offset(limit * Math.max(0, page - 1))
      .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? parseInt(results.rows[0].total, 10) : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);
    
    return {
      page,
      total,
      items
    };
  }

  public async getByAccountIdAndClass(accountId: string, locClass: string = 'unit', size: number = 100, page: number = 1): Promise<LocationPgPage> {

    const { text, values } = squel.useFlavour('postgres')
      .select()
      .field('"l".*')
      .field('COUNT(*) OVER()', '"total"')
      .from('"user_location"', '"ul"')
      .join('"location"', '"l"', '"ul"."location_id" = "l"."id"')
      .where('"ul"."account_id" = ?', accountId)
      .where('"l"."location_class" = ?', locClass)
      .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? parseInt(results.rows[0].total, 10) : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);

    return {
      page,
      total,
      items
    };
  }

  public async getByUserIdWithChildren(userId: string, size: number = 100, page: number = 1, filters: LocationFilters = {}, searchText: string = ''): Promise<LocationPgPage> {
    const limit = Math.max(1, size);
    const queryBuilder = this.applyFilters(
      squel.useFlavour('postgres')
        .select()
        .from('"location"', '"l"')
        .field('"l".*')
        .field('COUNT(*) OVER()', '"total"')
        .where(`
          EXISTS(
            SELECT 1 FROM "user_location" AS "ul"
            LEFT JOIN "location_tree" AS "lt" ON "ul"."location_id" = "lt"."parent_id"
            WHERE "ul"."user_id" = ?
            AND "l"."id" = COALESCE("lt"."child_id", "ul"."location_id")
          )
        `, userId),
      filters
    );
    const { text, values } = (
      searchText.trim() ?
        queryBuilder
          .where(
            'to_tsvector(\'simple\', f_concat_ws(\' \', "address", "address2", "city", "state", "postal_code", "country", "nickname")) @@ to_tsquery(\'simple\', ?)',
            this.getQueryTerms(searchText)
          ) :
        queryBuilder
    )
    .order('"l"."id"')
    .limit(limit)
    .offset(limit * Math.max(0, page - 1))
    .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? parseInt(results.rows[0].total, 10) : 0;
    const items = results.rows.map(({ total: ignoreTotal, ...item }) => item);

    return {
      page,
      total,
      items
    };
  }

  public async getFacetByUserId(userId: string, facet: string, size: number = 100, page: number = 1, contains?: string): Promise<LocationFacetPgPage> {
    const facetColumnMap: Record<string, string> = {
      'class': 'location_class',
      postalCode: 'postal_code',
      city: 'city',
      state: 'state',
      country: 'country'
    };
    const column = facetColumnMap[facet];

    if (!column) {
      return {
        name: facet,
        total: 0,
        page: 1,
        items: []
      };
    }

    const limit = Math.max(1, size);
    const queryBuilder = squel.useFlavour('postgres')
      .select()
      .from('"location"', '"l"')
      .field(`"l"."${ column }"`)
      .field(`COUNT(*) OVER()`, '"total"')
      .where(`
        EXISTS(
          SELECT 1 FROM "user_location" AS "ul"
          LEFT JOIN "location_tree" AS "lt" ON "ul"."location_id" = "lt"."parent_id"
          WHERE "ul"."user_id" = ?
          AND "l"."id" = COALESCE("lt"."child_id", "ul"."location_id")
        )
      `, userId);
    const { text, values } = (
      contains && contains.trim() ?
        queryBuilder
          .where(`"l"."${ column }" ILIKE '%${ contains.trim() }%'`) :
        queryBuilder
    )
    .group(`"l"."${ column }"`)
    .order(`"l"."${ column }"`)
    .limit(limit)
    .offset(limit * Math.max(0, page - 1))
    .toParam();
    const results = await this.pgDbClient.execute(text, values);
    const total = results.rows[0] ? parseInt(results.rows[0].total, 10) : 0;
    const items = _.flatMap(results.rows, (({ total: ignoreTotal, ...item }) => _.values(item)));

    return {
      name: facet,
      page,
      total,
      items
    };
  }

  private applyFilters(queryBuilder: squel.PostgresSelect, filters: LocationFilters, alias: string = 'l'): squel.PostgresSelect {
    const filterMap = {
      locClass: 'location_class',
      city: 'city',
      country: 'country',
      state: 'state',
      postalCode: 'postal_code',
      parentId: 'parent_location_id'
    };

    return _.reduce(filters, (query, value, key) => {
      if (_.isEmpty(value)) {
        return query;
      }

      const column = (filterMap as any)[key] as string;

      const op = _.isArray(value) ? 'IN' : '=';
      return query.where(`"${ alias }"."${ column }" ${op} ?`, value);
    }, queryBuilder);
  }

  private getQueryTerms(searchText: string): string {
    return searchText.split(/[\s()|&:*!]+/g).filter(term => term).map(term => `${term}:*`).join(' & ');
  }
}

export default LocationPgTable;