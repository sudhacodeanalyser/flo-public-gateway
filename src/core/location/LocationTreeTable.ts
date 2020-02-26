import { inject, injectable, targetName } from 'inversify';
import squel from 'squel';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';

export type LocationTreeRow = { parent_id: string, child_id: string, depth: number };

@injectable()
class LocationTreeTable extends PostgresTable<LocationTreeRow> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'location_tree');
  }

  public async updateParent(id: string, parentId: string | null, hasPrevParent: boolean): Promise<void> {
    const removeExistingSubTree = hasPrevParent && {
      text: `
        DELETE FROM "location_tree" AS "d"
        USING "location_tree" AS "p"
        JOIN "location_tree" AS "c" 
        ON "p"."child_id" = "c"."child_id"
        LEFT JOIN "location_tree" AS "l" 
        ON "l"."parent_id" = "c"."parent_id" 
        AND "l"."child_id" = "p"."parent_id"
        WHERE "d"."parent_id" = "p"."parent_id"
        AND "d"."child_id" = "p"."child_id"
        AND "c"."parent_id" = $1 
        AND "l"."parent_id" IS NULL
      `,
      values: [id]
    };

    const selfLinkParent = parentId && squel.useFlavour('postgres')
      .insert()
      .into('location_tree')
      .setFields({
        parent_id: parentId,
        child_id: parentId,
        depth: 0
      })
      .onConflict('parent_id, child_id')
      .toParam();
    const selfLinkChild = parentId && squel.useFlavour('postgres')
      .insert()
      .into('location_tree')
      .setFields({
        parent_id: id,
        child_id: id,
        depth: 0
      })
      .onConflict('parent_id, child_id')
      .toParam();
    const buildNewSubtree = parentId && squel.useFlavour('postgres')
      .insert()
      .into('location_tree')
      .fromQuery(
        ['parent_id', 'child_id', 'depth'],
        squel.useFlavour('postgres')
          .select()
            .field('p.parent_id')
            .field('c.child_id')
            .field('p.depth+c.depth+1')
            .from('location_tree', 'p')
            .cross_join('location_tree', 'c')
            .where('p.child_id = ?', parentId)
            .where('c.parent_id = ?', id)
      )
      .toParam();

    await this.pgDbClient.executeTransaction(
      [
        removeExistingSubTree, 
        selfLinkParent, 
        selfLinkChild, 
        buildNewSubtree
      ]
      .filter(query => !!query) as Array<{ text: string, value?: any[] }>
    );
  }

  public async removeSubTree(id: string): Promise<void> {
    const query = `
      DELETE FROM location_tree AS "d"
      USING location_tree AS "p"
      WHERE "d"."child_id" = "p"."child_id"
      AND "p"."parent_id" = ?
    `;

    await this.pgDbClient.execute(query, [id]);
  }

  public async getImmediateChildren(id: string): Promise<LocationTreeRow[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .field('parent_id')
      .field('child_id')
      .field('depth')
      .where('parent_id = ?', id)
      .where('depth = 1');

    return this.query({ query });
  }

  public async getAllChildren(id: string): Promise<LocationTreeRow[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .field('parent_id')
      .field('child_id')
      .field('depth')
      .where('parent_id = ?', id)
      .where('depth > 0');

    return this.query({ query });
  }

  public async batchGetAllChildren(ids: string[]): Promise<LocationTreeRow[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .field('parent_id')
      .field('child_id')
      .field('depth')
      .where('parent_id IN ?', ids)
      .where('depth > 0');

    return this.query({ query });
  }

  public async getAllParents(id: string): Promise<LocationTreeRow[]> {
    const query = squel.useFlavour('postgres')
      .select()
      .field('parent_id')
      .field('child_id')
      .field('depth')
      .where('child_id = ?', id)
      .where('depth > 0');

    return this.query({ query });
  }
}

export default LocationTreeTable;