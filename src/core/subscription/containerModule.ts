import { ContainerModule, interfaces } from 'inversify';
import SubscriptionPlanTable from './SubscriptionPlanTable';
import { SubscriptionResolver } from './SubscriptionResolver';
import { SubscriptionService } from '../service';
import SubscriptionTable from './SubscriptionTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SubscriptionPlanTable>('SubscriptionPlanTable').to(SubscriptionPlanTable);
  bind<SubscriptionTable>('SubscriptionTable').to(SubscriptionTable);
  bind<SubscriptionResolver>('SubscriptionResolver').to(SubscriptionResolver);
  bind<SubscriptionService>('SubscriptionService').to(SubscriptionService);
});