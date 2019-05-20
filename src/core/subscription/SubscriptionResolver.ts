import { inject, injectable } from 'inversify';
import uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { DependencyFactoryFactory, PartialBy, Subscription } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import SubscriptionPlanTable from '../subscription/SubscriptionPlanTable';
import SubscriptionTable from '../subscription/SubscriptionTable';
import { SubscriptionPlanRecord, SubscriptionPlanRecordData } from './SubscriptionPlanRecord';
import { SubscriptionRecord, SubscriptionRecordData } from './SubscriptionRecord';

@injectable()
class SubscriptionResolver extends Resolver<Subscription> {
  protected propertyResolverMap: PropertyResolverMap<Subscription> = {
    plan: async (subscription: Subscription, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      const subscriptionPlanRecordData = await this.getPlanById(subscription.plan.id);

      if (subscriptionPlanRecordData === null) {
        return null;
      }
      return new SubscriptionPlanRecord(subscriptionPlanRecordData).toModel();
    },
    location: async (subscription: Subscription, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      return this.locationResolverFactory().get(subscription.location.id);
    }
  };
  private locationResolverFactory: () => LocationResolver;

  constructor(
   @inject('SubscriptionTable') private subscriptionTable: SubscriptionTable,
   @inject('SubscriptionPlanTable') private subscriptionPlanTable: SubscriptionPlanTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
  }

  public generateSubscriptionId(): string {
    return uuid.v4();
  }

  public async create(subscription: PartialBy<Subscription, 'id'>): Promise<Subscription> {
    const plan = await this.getPlanById(subscription.plan.id);
    if (plan === null) {
      throw new ResourceDoesNotExistError('Plan does not exist.');
    }
    const location = await this.locationResolverFactory().get(subscription.location.id);
    if (location === null) {
      throw new ResourceDoesNotExistError('Location does not exist.');
    }

    const subscriptionWithId: Subscription = {
      id: uuid.v4(),
      ...subscription // This may deliberately overwrite id.
    }
    const subscriptionRecordData = SubscriptionRecord.fromModel(subscriptionWithId);

    const createdSubscriptionRecordData = await this.subscriptionTable.put(subscriptionRecordData);

    return new SubscriptionRecord(createdSubscriptionRecordData).toModel();
  }

  public async get(id: string, expandProps: string[] = []): Promise<Subscription | null> {
    const subscriptionRecordData: SubscriptionRecordData | null = await this.subscriptionTable.get({ id });

    if (subscriptionRecordData === null) {
      return null;
    }

    return this.toModel(subscriptionRecordData, expandProps);
  }

  public async getByRelatedEntityId(relatedEntityId: string): Promise<Subscription | null> {
    const subscriptionRecordData: SubscriptionRecordData | null = await this.subscriptionTable.getByRelatedEntityId(relatedEntityId);

    if (subscriptionRecordData === null) {
      return null;
    }

    return this.toModel(subscriptionRecordData);
  }

  public async getByProviderCustomerId(customerId: string): Promise<Subscription | null> {
    const subscriptionRecordData: SubscriptionRecordData | null = await this.subscriptionTable.getByProviderCustomerId(customerId);

    if (subscriptionRecordData === null) {
      return null;
    }

    return this.toModel(subscriptionRecordData);
  }

  public async updatePartial(id: string, partialSubscription: Partial<Subscription>): Promise<Subscription> {
    const subscriptionRecordData = SubscriptionRecord.fromPartialModel(partialSubscription);
    const patch = fromPartialRecord<SubscriptionRecordData>(subscriptionRecordData);
    const updateSubscription = await this.subscriptionTable.update({ id }, patch);

    return new SubscriptionRecord(updateSubscription).toModel();
  }

  public async remove(id: string): Promise<void> {
    return this.subscriptionTable.remove({ id });
  }

  public async getPlanById(planId: string): Promise<SubscriptionPlanRecordData | null> {
    return this.subscriptionPlanTable.get({ plan_id: planId });
  }

  private async toModel(subscriptionRecordData: SubscriptionRecordData, expandProps: string[] = []): Promise<Subscription> {
    const subscription = new SubscriptionRecord(subscriptionRecordData).toModel();
    const expandedProps = await this.resolveProps(subscription, expandProps);

    return {
      ...subscription,
      ...expandedProps
    };
  }
}

export { SubscriptionResolver };
