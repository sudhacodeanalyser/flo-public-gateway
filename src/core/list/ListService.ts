import { inject, injectable } from 'inversify';
import { ListTable } from './ListTable';
import { ListItemRecord, fromRecord } from './ListItemRecord';
import { List } from '../api';
import _ from 'lodash';

@injectable()
class ListService {
  constructor(
    @inject('ListTable') private listTable: ListTable 
  ) {}

  public async getByIds(ids: string[]): Promise<List> {
    const result = await this.listTable.getLists(ids);

    return _.chain(result)
      .groupBy('list_id')
      .mapValues((listItemRecords: ListItemRecord[]) => listItemRecords.map(fromRecord))
      .value();
  }
}

export { ListService };