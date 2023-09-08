import { inject, injectable } from 'inversify';
import * as uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { DependencyFactoryFactory, PartialBy, Subscription, PropExpand } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import SubscriptionPlanTable from '../subscription/SubscriptionPlanTable';
import SubscriptionTable from '../subscription/SubscriptionTable';
import OldSubscriptionTable from './OldSubscriptionTable';
import { SubscriptionPlanRecord, SubscriptionPlanRecordData } from './SubscriptionPlanRecord';
import { SubscriptionRecord, SubscriptionRecordData } from './SubscriptionRecord';
import { OldSubscriptionRecord, OldSubscriptionRecordData } from './OldSubscriptionRecord';

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
    location: async (subscription: Subscription, shouldExpand = false, expandProps?: PropExpand) => {
      if (!shouldExpand) {
        return null;
      }

      return this.locationResolverFactory().get(subscription.location.id, expandProps);
    }
  };
  private locationResolverFactory: () => LocationResolver;

  constructor(
   // TODO: Remove this dependency once data migration is completed.
   @inject('OldSubscriptionTable') private oldSubscriptionTable: OldSubscriptionTable,
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
     const subscriptionWithId: Subscription = {
      id: uuid.v4(),
      ...subscription // This may deliberately overwrite id.
    }
    const subscriptionRecordData = SubscriptionRecord.fromModel(subscriptionWithId);

    const createdSubscriptionRecordData = await this.subscriptionTable.put(subscriptionRecordData);

    return new SubscriptionRecord(createdSubscriptionRecordData).toModel();
  }

  public async get(id: string, expandProps?: PropExpand): Promise<Subscription | null> {
    const subscriptionRecordData: SubscriptionRecordData | null = await this.subscriptionTable.get({ id });

    if (subscriptionRecordData !== null) {
      return this.toModel(subscriptionRecordData, expandProps);
    }

    return this.getByAccountId(id);
  }

  public async getByRelatedEntityId(relatedEntityId: string): Promise<Subscription | null> {
    const subscriptionRecordData: SubscriptionRecordData | null = await this.subscriptionTable.getByRelatedEntityId(relatedEntityId);

    if (subscriptionRecordData !== null) {
      return this.toModel(subscriptionRecordData);
    }

    const oldSubscriptionRecordData = await this.oldSubscriptionTable.getByLocationId(relatedEntityId);

    if (oldSubscriptionRecordData !== null) {
      return this.toModel(oldSubscriptionRecordData);
    }

    return null;
  }

  // TODO: Remove me once data migration is completed.
  public async getByAccountId(accountId: string): Promise<Subscription | null> {
    const subscriptionRecordData = await this.oldSubscriptionTable.get({ account_id: accountId });

    if (subscriptionRecordData === null) {
      return null;
    }

    return this.toModel(subscriptionRecordData);
  }

  public async getByProviderCustomerId(customerId: string): Promise<Subscription[]> {
    // Possible for a customer with multiple subscriptions to have subscriptions in both old and new table
    const subscriptionRecordData = await this.subscriptionTable.getByProviderCustomerId(customerId);
    const oldSubscriptionRecordData = await this.oldSubscriptionTable.getByCustomerId(customerId);

    return Promise.all(
      [
        ...subscriptionRecordData,
        ...(oldSubscriptionRecordData ? [oldSubscriptionRecordData] : [])
      ]
      .map(record => this.toModel(record))
    );
  }

  public async updatePartial(id: string, partialSubscription: Partial<Subscription>): Promise<Subscription> {
    const subscriptionRecordData = SubscriptionRecord.fromPartialModel(partialSubscription);
    const patch = fromPartialRecord<SubscriptionRecordData>(subscriptionRecordData);

    try {
      const updateSubscription = await this.subscriptionTable.update({ id }, patch);

      return new SubscriptionRecord(updateSubscription).toModel();
    } catch (err) {

      if (!(err instanceof ResourceDoesNotExistError)) {
        throw err; 
      }
      // Migrate old subscription record to new table if updated
      const subscriptionModel = await this.getByAccountId(id);

      if (subscriptionModel === null) {
        throw err;
      }

      const newSubscriptionRecordData = await this.create(subscriptionModel);

      return this.updatePartial(newSubscriptionRecordData.id, partialSubscription);
    }

  }

  public async remove(id: string): Promise<void> {
    try {
      return this.subscriptionTable.remove({ id });
    } catch (err) {

      if (!(err instanceof ResourceDoesNotExistError)) {
        throw err;
      }

      return this.oldSubscriptionTable.remove({ account_id: id });
    }
  }

  public async getPlanById(planId: string): Promise<SubscriptionPlanRecordData | null> {
    return this.subscriptionPlanTable.get({ plan_id: planId });
  }

  public async scan(limit?: number, expandProps?: PropExpand, next?: any): Promise<{ items: Subscription[], nextIterator?: any }> {
    const { items, nextIterator } = await this.subscriptionTable.scan(limit, next);
    const subscriptions = await Promise.all(
      items.map(item => this.toModel(item, expandProps))
    );

    return {
      items: subscriptions,
      nextIterator
    };
  }

  private async toModel(subscriptionRecordData: SubscriptionRecordData | OldSubscriptionRecordData, expandProps?: PropExpand): Promise<Subscription> {
    const subscription = OldSubscriptionRecord.isOldSubscriptionRecord(subscriptionRecordData) ?
      OldSubscriptionRecord.toModel(subscriptionRecordData) :
      new SubscriptionRecord(subscriptionRecordData).toModel();
    const expandedProps = await this.resolveProps(subscription, expandProps);

    return {
      ...subscription,
      ...expandedProps
    };
  }
}

export { SubscriptionResolver };

