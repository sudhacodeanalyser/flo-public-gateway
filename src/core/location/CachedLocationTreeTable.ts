import { inject, injectable, targetName } from 'inversify';
import LocationTreeTable, { LocationTreeRow } from './LocationTreeTable';
import Redis from 'ioredis';
import { CachePolicy } from '../../cache/CacheMiddleware';
import _ from 'lodash';

@injectable()
class CachedLocationTreeTable extends LocationTreeTable {
    @inject('RedisClient') protected redisClient: Redis.Redis;
    @inject('CachePolicy') protected cachePolicy: CachePolicy;
​
    public async getAllChildren(accountId: string, id: string): Promise<LocationTreeRow[]> {
      const key = this.formatChildrenKey(accountId, id);
      const results = await this.redisClient
        .multi()
        .zrange(key, 1, -1, 'WITHSCORES')
        .exists(key)
        .exec();
      const [children, isCached] = results.map(([err, result]: any[]) => {
        if (err) {
          throw err;
        }

        return result;
      });
​
      if (isCached) {
        return _.chain(children || [])
          .chunk(2)
          .map((childDepth: any[]) => ({ 
            child_id: childDepth[0] as string, 
            parent_id: id, 
            depth: childDepth[1] as number 
          }))
          .value();
      } 
​
      // Cache miss
      const data = await super.getAllChildren(accountId, id);
​      const cacheData = _.flatMap(
        [{ child_id: id, parent_id: id, depth: 0 }, ...data], 
        row => [`${row.depth}`, row.child_id]
      );

      await this.redisClient.zadd(key, ...cacheData);
​
      return data;
    }
​
    public async getImmediateChildren(accountId: string, id: string): Promise<LocationTreeRow[]> {
      const key = this.formatChildrenKey(accountId, id);
      const results = await this.redisClient
        .multi()
        .zrangebyscore(key, 1, 1)
        .exists(key)
        .exec();
​      const [children, isCached] = results.map(([err, result]: any[]) => {
        if (err) {
          throw err;
        }

        return result;
      });

      if (isCached) {
        return (children || [])
          .map((child: string) => ({ 
            child_id: child, 
            parent_id: id, 
            depth: 1 
          }));
      }
​
      const allChildren = await this.getAllChildren(accountId, id);
​
      return allChildren.filter(({ depth }) => depth === 1);
    }
​
    public async getAllParents(accountId: string, id: string): Promise<LocationTreeRow[]> {
      const key = this.formatParentsKey(accountId, id);
      const results = await this.redisClient
        .multi()
        .zrange(key, 1, -1, 'WITHSCORES')
        .exists(key)
        .exec();
      const [parents, isCached] = results.map(([err, result]: any[]) => {
        if (err) {
          throw err;
        }

        return result;
      });
​
      if (isCached) {
        return _.chain(parents || [])
          .chunk(2)
          .map((parentDepth: any[]) => ({
            child_id: id,
            parent_id: parentDepth[0] as string,
            depth: parentDepth[1] as number
          }))
          .value();
      } 
​
      // Cache miss
      const data = await super.getAllParents(accountId, id);
      const cacheData = _.flatMap(
        [{ child_id: id, parent_id: id, depth: 0 }, ...data], 
        row => [`${row.depth}`, row.parent_id]
      );

      await this.redisClient.zadd(key, ...cacheData);
​
      return data;
    }
​
    public async removeSubTree(accountId: string, id: string): Promise<void> {
      const allChildren = await super.getAllChildren(accountId, id);
      const allParents = await super.getAllParents(accountId, id);
​
      await super.removeSubTree(accountId, id);

      const multi = this.redisClient.multi()
          .del(this.formatParentsKey(accountId, id))
          .del(this.formatChildrenKey(accountId, id));

      allChildren.forEach(({ child_id }) => 
        multi
          .del(this.formatParentsKey(accountId, child_id))
          .del(this.formatChildrenKey(accountId, child_id))      
      );

      allParents.forEach(({ parent_id }) =>
        multi
          .zrem(this.formatChildrenKey(accountId, parent_id), id)
      );
​
      (await multi.exec())
        .forEach(([err]: any[]) => {
          if (err) {
            throw err;
          }
        });
    }
​
    public async updateParent(accountId: string, id: string, parentId: string | null, hasPrevParent: boolean): Promise<void> {
 
      const [allChildren, allParents] = await Promise.all([
        super.getAllChildren(accountId, id),
        super.getAllParents(accountId, id)
      ]);
​
      await super.updateParent(accountId, id, parentId, hasPrevParent);
​
      const multi = this.redisClient.multi()
        .del(this.formatParentsKey(accountId, id));

      allChildren.forEach(({ child_id }) => multi.del(this.formatParentsKey(accountId, child_id)));
      allParents.forEach(({ parent_id }) => multi.del(this.formatChildrenKey(accountId, parent_id)));

      if (parentId) {
        multi.del(this.formatChildrenKey(accountId, parentId));
      }

      (await multi.exec()).forEach(([err]: any[]) => { 
        if (err) {
          throw err;
        }
      });
    }

    public async batchGetAllChildren(accountId: string, ids: string[]): Promise<LocationTreeRow[]> {
      return _.flatten(await Promise.all(
        ids.map(id => this.getAllChildren(accountId, id))
      ));
    }
​
    private formatParentsKey(accountId: string, id: string): string {
      return `parents:{${accountId}}:${ id }`;
    }
​
    private formatChildrenKey(accountId: string, id: string): string {
      return `children:{${accountId}}:${ id }`; 
    }

}
​
export default CachedLocationTreeTable;