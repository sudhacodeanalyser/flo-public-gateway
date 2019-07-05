import { ContainerModule, interfaces } from 'inversify';
import { SubscriptionService } from '../service';
import OldSubscriptionTable from './OldSubscriptionTable';
import SubscriptionPlanTable from './SubscriptionPlanTable';
import { SubscriptionResolver } from './SubscriptionResolver';
import SubscriptionTable from './SubscriptionTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SubscriptionPlanTable>('SubscriptionPlanTable').to(SubscriptionPlanTable);
  bind<SubscriptionTable>('SubscriptionTable').to(SubscriptionTable);
  bind<OldSubscriptionTable>('OldSubscriptionTable').to(OldSubscriptionTable);
  bind<SubscriptionResolver>('SubscriptionResolver').to(SubscriptionResolver);
  bind<SubscriptionService>('SubscriptionService').to(SubscriptionService);
});