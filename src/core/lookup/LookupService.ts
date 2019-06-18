import { inject, injectable } from 'inversify';
import { LookupTable } from './LookupTable';
import { LookupItemRecord, fromRecord } from './LookupItemRecord';
import { Lookup } from '../api';
import _ from 'lodash';

@injectable()
class LookupService {
  constructor(
    @inject('LookupTable') private lookupTable: LookupTable 
  ) {}

  public async getByIds(ids: string[]): Promise<Lookup> {
    const result = await this.lookupTable.getLookups(ids);

    return _.chain(result)
      .groupBy('list_id')
      .mapValues((lookupItemRecords: LookupItemRecord[]) => lookupItemRecords.map(fromRecord))
      .value();
  }
}

export { LookupService };