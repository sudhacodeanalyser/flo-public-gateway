import { ContainerModule, interfaces } from 'inversify';
import { SubscriptionResolver } from './SubscriptionResolver';
import SubscriptionService from './SubscriptionService';
import SubscriptionTable from './SubscriptionTable';
import SubscriptionPlanTable from './SubscriptionPlanTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SubscriptionPlanTable>('SubscriptionPlanTable').to(SubscriptionPlanTable);
  bind<SubscriptionTable>('SubscriptionTable').to(SubscriptionTable);
  bind<SubscriptionResolver>('SubscriptionResolver').to(SubscriptionResolver);
  bind<SubscriptionService>('SubscriptionService').to(SubscriptionService);
});