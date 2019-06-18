import { inject, injectable } from 'inversify';
import { ListTable } from './ListTable';
import { LookupItemRecord, fromRecord } from './LookupItemRecord';
import { Lookup } from '../api';
import _ from 'lodash';

@injectable()
class ListService {
  constructor(
    @inject('ListTable') private listTable: ListTable 
  ) {}

  public async getByIds(ids: string[]): Promise<Lookup> {
    const result = await this.listTable.getLookups(ids);

    return _.chain(result)
      .groupBy('list_id')
      .mapValues((LookupItemRecords: LookupItemRecord[]) => LookupItemRecords.map(fromRecord))
      .value();
  }
}

export { ListService };