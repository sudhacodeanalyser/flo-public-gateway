import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { Lookup } from '../api';
import { fromRecord, LookupItemRecord } from './LookupItemRecord';
import { LookupTable } from './LookupTable';

@injectable()
class LookupService {
  constructor(
    @inject('LookupTable') private lookupTable: LookupTable
  ) {}

  public async getByIds(ids: string[], prefixes?: string[], lang?: string): Promise<Lookup> {
    const result = await this.lookupTable.getLookups(ids, prefixes, lang);

    return _.chain(result)
      .groupBy('list_id')
      .mapValues((lookupItemRecords: LookupItemRecord[]) => lookupItemRecords.map(fromRecord))
      .value();
  }
}

export { LookupService };
