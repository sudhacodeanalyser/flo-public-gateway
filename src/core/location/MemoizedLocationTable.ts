import { inject, injectable } from 'inversify';
import LocationTable from './LocationTable';
import { LocationRecordData } from './LocationRecord';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

@injectable()
class MemoizedLocationTable extends MemoizeMixin(LocationTable) {

  @memoized()
  public async getByLocationId(locationId: string): Promise<LocationRecordData | null> {
    return super.getByLocationId(locationId);
  }

  @memoized()
  public async getAllByAccountId(accountId: string): Promise<LocationRecordData[]> {
    return super.getAllByAccountId(accountId);
  }
}

export default MemoizedLocationTable;