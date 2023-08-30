import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { Lookup } from '../api';
import { fromRecord, LookupItemRecord } from './LookupItemRecord';
import { LookupTable } from './LookupTable';
import moment from 'moment';

@injectable()
class LookupService {
  private static readonly defaultLang = 'en';

  constructor(
    @inject('LookupTable') private lookupTable: LookupTable,
    @inject('ListCache') private listCache: Lookup,
    @inject('ListCacheTtl') private listCacheTtl: Record<string, string | undefined>
  ) {}

  public async getByIds(ids: string[], prefixes?: string[], lang?: string): Promise<Lookup> {
    const cached = _.chain(this.listCache)
      .pick(ids)
      .pickBy((value, listId) => {
        const listTtl = this.listCacheTtl[listId];
        return listTtl && moment().isBefore(listTtl);
      })
      .mapValues(value => 
        value.filter(({ lang: itemLang }) => 
          this.normalizeLang(lang) === itemLang 
        )
      )
      .pickBy(value => !_.isEmpty(value))
      .value();
    const dbIds = _.difference(ids, _.keys(cached));
    const dbResult = dbIds.length || (prefixes && prefixes.length) ? (await this.lookupTable.getLookups(dbIds, prefixes, lang)) : [];
    const dbLookups = _.chain(dbResult)
      .groupBy('list_id')
      .mapValues((lookupItemRecords: LookupItemRecord[]) => lookupItemRecords.map(fromRecord))
      .value();

    if (!_.isEmpty(dbResult)) {
      _.forEach(dbLookups, (items, listId) => {

        this.listCache[listId] = _.uniqBy(
          [...(this.listCache[listId] || []), ...items],
          ({ key, lang: itemLang }) => `${ key }_${ itemLang }`
        );

        this.listCacheTtl[listId] = moment().add(60, 'seconds').toISOString();
      });
    }

    return {
      ...cached,
      ...dbLookups
    };
  }

  public normalizeLang(lang?: string): string {
    // Return default if empty
    if (!lang) {
      return LookupService.defaultLang
    }

    return _.head(lang.split('-'))!.toLowerCase();
  }

}

export { LookupService };
