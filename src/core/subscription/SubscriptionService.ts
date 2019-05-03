import { injectable, inject } from 'inversify';
import { Subscription, SubscriptionCreate, SubscriptionProvider } from '../api/api';
import { SubscriptionResolver } from '../resolver';
import { Omit } from '../api/model/model';
import UserService from '../user/UserService';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';

@injectable()
class SubscriptionService {
  constructor(
    @inject('SubscriptionResolver') private subscriptionResolver: SubscriptionResolver,
    @inject('UserService') private userService: UserService
  ) {}

  public async createSubscription(subscriptionCreate: SubscriptionCreate): Promise<Subscription | {}> {
    const subscription: Omit<Subscription, 'id'> = {
      plan: subscriptionCreate.plan,
      location: subscriptionCreate.location,
      sourceId: subscriptionCreate.sourceId
    }
    // TODO: Implement Subscription Provider integration.
    const provider: SubscriptionProvider = {
      name: 'stripe',
      customerId: '12345',
      subscriptionId: '67890'
    }

    const user = await this.userService.getUserById(subscriptionCreate.user.id);
    if (user === null) {
      throw new ResourceDoesNotExistError('User does not exist.');
    }

    const createdSubscription: Subscription | null = await this.subscriptionResolver.createSubscription(subscriptionCreate, provider);
    return createdSubscription === null ? {} : createdSubscription;
  }

  public async getSubscriptionById(id: string, expand?: string[]): Promise<Subscription | {}> {
    const subscription: Subscription | null = await this.subscriptionResolver.get(id, expand);

    return subscription === null ? {} : subscription;
  }

  public async removeSubscription(id: string): Promise<void> {
    return this.subscriptionResolver.remove(id);
  }
}

export default SubscriptionService;