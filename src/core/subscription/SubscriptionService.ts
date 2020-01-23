import { inject, injectable, multiInject } from 'inversify';
import _ from 'lodash';
import { Location, PartialBy, Subscription, SubscriptionCreate, SubscriptionProvider, User, PropExpand, CreditCardInfo } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import NotFoundError from '../api/error/NotFoundError';
import { LocationService, UserService, EntityActivityService, EntityActivityType, EntityActivityAction } from '../service';
import { SubscriptionResolver } from '../resolver';
import { isNone, fromNullable, Option } from 'fp-ts/lib/Option';

@injectable()
class SubscriptionService {
  constructor(
    @inject('SubscriptionResolver') private subscriptionResolver: SubscriptionResolver,
    @inject('UserService') private userService: UserService,
    @inject('LocationService') private locationService: LocationService,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService,
    @multiInject('SubscriptionProvider') private subscriptionProviders: SubscriptionProvider[]
  ) {}

  public async createSubscription(subscriptionCreate: SubscriptionCreate): Promise<Subscription> {
    const user = await this.userService.getUserById(subscriptionCreate.user.id);
    const subscriptionData = {
      ...subscriptionCreate,
      sourceId: subscriptionCreate.sourceId || 'flo',
    };

    if (isNone(user)) {
      throw new ResourceDoesNotExistError('User does not exist.');
    }
    if (!this.userService.isUserAccountOwner(user.value)) {
      throw new ValidationError('User is not the Account Owner.');
    }

    const location = await this.validateLocationExists(subscriptionCreate.location.id);

    const maybeExistingSubscription = await this.subscriptionResolver.getByRelatedEntityId((location as Location).id);


    // Reactivate a subscription that is set to be canceled at the end of the billing period
    if (
      !_.isEmpty(maybeExistingSubscription) && 
      maybeExistingSubscription !== null && 
      maybeExistingSubscription.provider.isActive &&
      maybeExistingSubscription.provider.data &&
      maybeExistingSubscription.provider.data.cancelAtPeriodEnd
    ) { 
      const subscriptionProvider = this.getProvider(subscriptionCreate.provider.name);

      if (subscriptionCreate.provider.token) {
        await subscriptionProvider.updatePaymentSource(user.value, subscriptionCreate.provider.token);
      }

      const providerInfo = await subscriptionProvider.reactiveSubscription({
        ...maybeExistingSubscription,
        plan: subscriptionCreate.plan || maybeExistingSubscription.plan
      });

      return {
        ...subscriptionData,
        plan: subscriptionCreate.plan || maybeExistingSubscription.plan,
        id: maybeExistingSubscription.id,
        provider: providerInfo
      };

    } else if (
      !_.isEmpty(maybeExistingSubscription) && 
      maybeExistingSubscription !== null && 
      maybeExistingSubscription.provider.isActive
    ) {
      throw new ValidationError('A Subscription already exists for the given Location.');
    }

    if (!subscriptionCreate.plan) {
      throw new ValidationError('A plan must be specified.');
    }

    await this.validatePlanExists(subscriptionCreate.plan.id);

    const subscriptionId = maybeExistingSubscription ? maybeExistingSubscription.id : this.subscriptionResolver.generateSubscriptionId();
    // Create stubbed location so race condition with webhook does not create duplicate record
    const plan = subscriptionData.plan as Record<'id', string>;
    const subscriptionStub = {
      ...subscriptionData,
      id: subscriptionId,
      plan,
      isActive: false,
      provider: {
        name: subscriptionCreate.provider.name,
        status: '_PENDING_',
        isActive: false,
        data: {
          customerId: '_UNKNOWN_',
          subscriptionId: '_UNKNOWN_'
        }
      }
    };

    await this.createLocalSubscription(subscriptionStub);

    const subscriptionProvider = this.getProvider(subscriptionCreate.provider.name);
    const providerSubscription = {
      id: subscriptionId,
      ...subscriptionCreate
    };
    const allowTrial = !maybeExistingSubscription || !!(await subscriptionProvider.getCanceledSubscriptions(user.value)).length;
    const providerInfo = await subscriptionProvider.createSubscription(user.value, providerSubscription, allowTrial);
    const subscription = {
      ...subscriptionData,
      plan,
      id: subscriptionId,
      provider: providerInfo
    };

    await this.entityActivityService.publishEntityActivity(EntityActivityType.SUBSCRIPTION, EntityActivityAction.CREATED, subscription);
    
    return subscription;
  }

  public async createLocalSubscription(subscription: PartialBy<Subscription, 'id'>): Promise<Subscription> {
    return this.subscriptionResolver.create(subscription);
  }

  public async getSubscriptionById(id: string, expand?: PropExpand): Promise<Subscription | {}> {
    const subscription: Subscription | null = await this.subscriptionResolver.get(id, expand);

    if (subscription === null) {
      return {};
    }

    return subscription;
  }

  public async getSubscriptionByRelatedEntityId(id: string): Promise<Option<Subscription>> {
    const subscription: Subscription | null = await this.subscriptionResolver.getByRelatedEntityId(id);

    return fromNullable(subscription);
  }


  public async getSubscriptionByProviderCustomerId(customerId: string): Promise<Subscription[]> {

    return this.subscriptionResolver.getByProviderCustomerId(customerId);
  }

  public async cancelSubscription(id: string, shouldForce?: boolean, cancellationReason?: string): Promise<Subscription> {
    const subscription = await this.subscriptionResolver.get(id);

    if (subscription === null) {
      throw new ResourceDoesNotExistError('Subscription does not exist.');
    } else if (subscription.provider.data.status === 'canceled') {
      throw new ValidationError('Subscription already canceled.');
    }

    const shouldCancelImmediately = shouldForce !== undefined ?
      shouldForce :
      subscription.provider.data.status === 'trialing';

    const subscriptionProvider = this.getProvider(subscription.provider.name);
    const canceledProviderSubscription = await subscriptionProvider.cancelSubscription(subscription, shouldCancelImmediately);

    return this.subscriptionResolver.updatePartial(subscription.id, { cancellationReason, provider: canceledProviderSubscription });
  }

  public async updateSubscription(id: string, subscription: Partial<Subscription>): Promise<Subscription> {
    // Disabling for now to prevent webhook errors caused by internal plans that users
    // cannot directly subscribe to themselves and therefore do not exist in Dynamo
    // if (subscription.plan) {
    //   await this.validatePlanExists(subscription.plan.id);
    // }

    if (subscription.location) {
      await this.validateLocationExists(subscription.location.id);
    }

    const updatedSubscription = await this.subscriptionResolver.updatePartial(id, subscription);

    await this.entityActivityService.publishEntityActivity(EntityActivityType.SUBSCRIPTION, EntityActivityAction.CREATED, updatedSubscription);

    return updatedSubscription;
  }

  public async removeSubscription(id: string): Promise<void> {
    return this.subscriptionResolver.remove(id);
  }

  public async getPaymentSourcesByUserId(userId: string, providerName: string): Promise<CreditCardInfo[]> {
    const user = await this.userService.getUserById(userId);

    if (isNone(user)) {
      throw new NotFoundError('User not found.');
    }

    const subscriptionProvider = this.getProvider(providerName);
    
    return subscriptionProvider.getPaymentSources(user.value);
  }

  public async updatePaymentSourceByUserId(userId: string, providerName: string, token: string): Promise<CreditCardInfo[]> {
    const user = await this.userService.getUserById(userId);

    if (isNone(user)) {
      throw new NotFoundError('User not found.');
    }

    const subscriptionProvider = this.getProvider(providerName);

    return subscriptionProvider.updatePaymentSource(user.value, token);
  }

  public async scan(limit?: number, expand?: PropExpand, next?: any): Promise<{ items: Subscription[], nextIterator?: any }> {
    return this.subscriptionResolver.scan(limit, expand, next); 
  }

  private async validateLocationExists(locationId: string): Promise<Location> {
    const location = await this.locationService.getLocation(locationId);
    if (isNone(location)) {
      throw new ResourceDoesNotExistError('Location does not exist.');
    }
    return location.value;
  }

  private async validatePlanExists(planId: string): Promise<void> {
    const plan = await this.subscriptionResolver.getPlanById(planId);

    if (_.isEmpty(plan)) {
      throw new ResourceDoesNotExistError('Plan does not exist.');
    }
  }

  private getProvider(providerName: string): SubscriptionProvider {
    const subscriptionProvider = _.find(this.subscriptionProviders, ['name', providerName]);
    if (!subscriptionProvider) {
      throw new ResourceDoesNotExistError('Provider does not exist.');
    }
    return subscriptionProvider;
  }
}

export { SubscriptionService };