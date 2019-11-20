import { OldSubscriptionRecordData } from './OldSubscriptionRecord';
import { inject, injectable } from 'inversify';
import OldSubscriptionTable from './OldSubscriptionTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';


@injectable()
class MemoizedOldSubscriptionTable extends MemoizeMixin(OldSubscriptionTable) {

  @memoized()
  public async getByLocationId(locationId: string): Promise<OldSubscriptionRecordData | null> {
    return super.getByLocationId(locationId);
  }

  @memoized()
  public async getByCustomerId(customerId: string): Promise<OldSubscriptionRecordData | null> {
    return super.getByCustomerId(customerId);
  }
}

export default MemoizedOldSubscriptionTable;