import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { Lookup } from '../api';
import { fromRecord, LookupItemRecord } from './LookupItemRecord';
import { LookupTable } from './LookupTable';

@injectable()
class LookupService {
  constructor(
    @inject('LookupTable') private lookupTable: LookupTable,
    @inject('ListCache') private listCache: Lookup
  ) {}

  public async getByIds(ids: string[], prefixes?: string[], lang?: string): Promise<Lookup> {
    const cached = _.chain(this.listCache)
      .pick(ids)
      .mapValues(value => 
        value.filter(({ lang: itemLang }) => 
          lang ? 
            lang === itemLang : 
            (itemLang.toLowerCase() === 'en-us' || itemLang.toLowerCase() === 'en')
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
      });
    }

    return {
      ...cached,
      ...dbLookups
    };
  }
}

export { LookupService };
