import { inject, injectable, multiInject } from 'inversify';
import _ from 'lodash';
import { Location, PartialBy, Subscription, SubscriptionCreate, SubscriptionProvider, User } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import { LocationService, UserService } from '../service';
import { SubscriptionResolver } from '../resolver';

@injectable()
class SubscriptionService {
  constructor(
    @inject('SubscriptionResolver') private subscriptionResolver: SubscriptionResolver,
    @inject('UserService') private userService: UserService,
    @inject('LocationService') private locationService: LocationService,
    @multiInject('SubscriptionProvider') private subscriptionProviders: SubscriptionProvider[]
  ) {}

  public async createSubscription(subscriptionCreate: SubscriptionCreate): Promise<Subscription> {
    const user = await this.userService.getUserById(subscriptionCreate.user.id);
    if (_.isEmpty(user)) {
      throw new ResourceDoesNotExistError('User does not exist.');
    }
    if (!this.userService.isUserAccountOwner(user as User)) {
      throw new ValidationError('User is not the Account Owner.');
    }

    const location = await this.validateLocationExists(subscriptionCreate.location.id);
    await this.validatePlanExists(subscriptionCreate.plan.id);

    const maybeExistingSubscription = await this.subscriptionResolver.getByRelatedEntityId((location as Location).id);
    if (!_.isEmpty(maybeExistingSubscription)) {
      throw new ValidationError('A Subscription already exists for the given Location.')
    }

    const subscriptionProvider = this.getProvider(subscriptionCreate.provider.name);

    const subscriptionId = this.subscriptionResolver.generateSubscriptionId();
    const providerSubscription = {
      id: subscriptionId,
      ...subscriptionCreate
    };

    const providerInfo = await subscriptionProvider.createSubscription(user as User, providerSubscription);

    const subscription = {
      ...subscriptionCreate,
      isActive: providerInfo.isActive,
      provider: providerInfo
    };

    const createdSubscription = await this.createLocalSubscription(subscription);

    return {
      ...createdSubscription,
      provider: {
        ...createdSubscription.provider,
        ...providerInfo
      }
    };
  }

  public async createLocalSubscription(subscription: PartialBy<Subscription, 'id'>): Promise<Subscription> {
    return this.subscriptionResolver.create(subscription);
  }

  public async getSubscriptionById(id: string, expand?: string[]): Promise<Subscription | {}> {
    const subscription: Subscription | null = await this.subscriptionResolver.get(id, expand);

    if (subscription === null) {
      return {};
    }

    const subscriptionProvider = this.getProvider(subscription.provider.name);
    const providerInfo = await subscriptionProvider.retrieveSubscription(subscription);

    return {
      ...subscription,
      provider: providerInfo
    };
  }

  public async getSubscriptionByRelatedEntityId(id: string): Promise<Subscription | {}> {
    const subscription: Subscription | null = await this.subscriptionResolver.getByRelatedEntityId(id);

    if (subscription === null) {
      return {};
    }

    return subscription;
  }


  public async getSubscriptionByProviderCustomerId(customerId: string): Promise<Subscription | {}> {
    const subscription: Subscription | null = await this.subscriptionResolver.getByProviderCustomerId(customerId);

    if (subscription === null) {
      return {};
    }

    return subscription;
  }



  public async updateSubscription(id: string, subscription: Partial<Subscription>): Promise<Subscription> {
    if (subscription.plan) {
      await this.validatePlanExists(subscription.plan.id);
    }

    if (subscription.location) {
      await this.validateLocationExists(subscription.location.id);
    }

    return this.subscriptionResolver.updatePartial(id, subscription);
  }

  public async removeSubscription(id: string): Promise<void> {
    return this.subscriptionResolver.remove(id);
  }

  private async validateLocationExists(locationId: string): Promise<Location> {
    const location = await this.locationService.getLocation(locationId);
    if (_.isEmpty(location)) {
      throw new ResourceDoesNotExistError('Location does not exist.');
    }
    return location as Location;
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