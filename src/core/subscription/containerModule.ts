import { ContainerModule, interfaces } from 'inversify';
import { SubscriptionService } from '../service';
import OldSubscriptionTable from './OldSubscriptionTable';
import SubscriptionPlanTable from './SubscriptionPlanTable';
import { SubscriptionResolver } from './SubscriptionResolver';
import SubscriptionTable from './SubscriptionTable';
import MemoizedSubscriptionTable from './MemoizedSubscriptionTable';
import MemoizedOldSubscriptionTable from './MemoizedOldSubscriptionTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SubscriptionPlanTable>('SubscriptionPlanTable').to(SubscriptionPlanTable);
  bind<SubscriptionTable>('SubscriptionTable').to(MemoizedSubscriptionTable);
  bind<OldSubscriptionTable>('OldSubscriptionTable').to(MemoizedOldSubscriptionTable);
  bind<SubscriptionResolver>('SubscriptionResolver').to(SubscriptionResolver);
  bind<SubscriptionService>('SubscriptionService').to(SubscriptionService);
});