import { inject, injectable } from 'inversify';
import uuid from 'uuid';
import { SubscriptionRecord, SubscriptionRecordData } from './SubscriptionRecord';
import { SubscriptionPlanRecordData, SubscriptionPlanRecord } from './SubscriptionPlanRecord';
import { Subscription, DependencyFactoryFactory, SubscriptionProvider } from '../api/api';
import { Resolver, PropertyResolverMap, LocationResolver } from '../resolver';
import { fromPartialRecord } from '../../database/Patch';
import SubscriptionTable from '../subscription/SubscriptionTable';
import SubscriptionPlanTable from '../subscription/SubscriptionPlanTable';
import { Omit } from '../api/model/model';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';

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

  public async createSubscription(subscription: Omit<Subscription, 'id'>, provider: SubscriptionProvider): Promise<Subscription | null> {
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
      ...subscription
    }
    const subscriptionRecordData = SubscriptionRecord.fromModel(subscriptionWithId, provider);

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

  public async remove(id: string): Promise<void> {
    return this.subscriptionTable.remove({ id });
  }

  private async getPlanById(planId: string): Promise<SubscriptionPlanRecordData | null> {
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