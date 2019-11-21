import { inject, injectable } from 'inversify';
import SubscriptionTable from './SubscriptionTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';
import { SubscriptionRecordData } from './SubscriptionRecord';

@injectable()
class MemoizedSubscriptionTable extends MemoizeMixin(SubscriptionTable) {

  @memoized()
  public async getByRelatedEntityId(relatedEntityId: string): Promise<SubscriptionRecordData | null> {
    return super.getByRelatedEntityId(relatedEntityId);
  }

  @memoized()
  public async getByProviderCustomerId(customerId: string): Promise<SubscriptionRecordData[]> {
    return super.getByProviderCustomerId(customerId);
  }
}

export default MemoizedSubscriptionTable;