import { fold, fromNullable, Option } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { PropExpand, UpdateAlarmSettings, User, UserUpdate, UserCreate, RetrieveAlarmSettingsFilter, EntityAlarmSettings, UserStats, DependencyFactoryFactory, AdminUserCreate } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import ConflictError from '../api/error/ConflictError';
import NotFoundError from '../api/error/NotFoundError';
import { UserResolver } from '../resolver';
import { DeviceService, EntityActivityAction, EntityActivityService, EntityActivityType, AccountService, SubscriptionService } from '../service';
import Logger from 'bunyan';
import { parseExpand } from '../api/controllerUtils';

@injectable()
class UserService {
  private subscriptionServiceFactory: () => SubscriptionService;

  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('UserResolver') private userResolver: UserResolver,
    @inject('AccountService') private accountService: AccountService,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService,
    @inject('DeviceService') private deviceService: DeviceService,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    this.subscriptionServiceFactory = depFactoryFactory('SubscriptionService');
  }

  public async updatePartialUser(id: string, userUpdate: UserUpdate): Promise<User> {
    const user = await this.userResolver.getUserById(id, {
      $select: {
        email: true
      }
    });
    const updatedUser = await this.userResolver.updatePartialUser(id, userUpdate);

    if (user && userUpdate?.email?.trim() && user.email !== updatedUser?.email?.trim()) {
      const account = await this.accountService.getAccountByOwnerUserId(id);

      if (!_.isEmpty(account)) {
        const subscriptionService = this.subscriptionServiceFactory();
        
        await subscriptionService.updateUserData(id, userUpdate);
      }
    }

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.USER,
      EntityActivityAction.UPDATED,
      updatedUser
    );

    return updatedUser;
  }

  public async isSuperUser(id: string): Promise<boolean> {
    return this.userResolver.isSuperUser(id);
  }

  public async getUserById(id: string, expand?: PropExpand): Promise<Option<User>> {
    const user: User | null = await this.userResolver.getUserById(id, expand);

    return fromNullable(user);
  }

  public async getUserByEmail(email: string, expand?: PropExpand): Promise<User | null> {
    return this.userResolver.getByEmail(email, expand);
  }

  public async removeUser(id: string): Promise<void> {
    const account = await this.accountService.getAccountByOwnerUserId(id);
    if (!_.isEmpty(account)) {
      throw new ValidationError('Cannot delete Account owner.');
    }

    const user = await this.userResolver.getUserById(id);

    if (!user) {
      throw new ConflictError('User not found.');
    }

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.USER,
      EntityActivityAction.DELETED,
      user
    );

    return this.userResolver.removeUser(id);
  }

  public isUserAccountOwner(user: Pick<User, 'accountRole'>): boolean {
    return _.includes(user.accountRole.roles, 'owner');
  }

  public async updateAlarmSettings(id: string, settings: UpdateAlarmSettings): Promise<void> {
    const result = await this.userResolver.updateAlarmSettings(id, settings);
    // Do not await. Instead fire-and-forget.
    this.publishAlarmSettingsUpdatedEvent(id);
    return result;
  }

  public async publishAlarmSettingsUpdatedEvent(id: string): Promise<void> {
    this.logger.info(`Raise alarm_settings updated event for ${id}`);
    try {
      const expandAlarmSettings = parseExpand('alarmSettings');
      const user = await this.userResolver.getUserById(id, expandAlarmSettings);

      if (!user) {
        throw new NotFoundError('User alarm settings not found.');
      }

      await this.entityActivityService.publishEntityActivity(
        EntityActivityType.ALARM_SETTINGS,
        EntityActivityAction.UPDATED,
        user
      );
    } catch (err) {
      this.logger.error({ 
        err, 
        message: "Could not raise alarm_settings updated event after settings change", 
        data: { 
          id
        }
      });
    }
  }

  public async retrieveAlarmSettings(id: string, filter: RetrieveAlarmSettingsFilter): Promise<EntityAlarmSettings> {
    return this.userResolver.retrieveAlarmSettings(id, filter);
  }

  public async addEnabledFeatures(id: string, features: string[]): Promise<void> {
    const maybeUser: Option<User> = fromNullable(await this.userResolver.getUserById(id));

    return pipe(
      maybeUser,
      fold(
        async () => { throw new ResourceDoesNotExistError('User does not exist') },
        async (user) => {
          const mergedFeatures = Array.from(new Set(_.concat(features, user.enabledFeatures)));
          return this.userResolver.setEnabledFeatures(user.id, mergedFeatures);
        }
      )
    );
  }

  public async removeEnabledFeatures(id: string, features: string[]): Promise<void> {
    const maybeUser: Option<User> = fromNullable(await this.userResolver.getUserById(id));

    return pipe(
      maybeUser,
      fold(
        async () => { throw new ResourceDoesNotExistError('User does not exist') },
        async (user) => {
          const difference = _.difference(user.enabledFeatures, features);
          return this.userResolver.setEnabledFeatures(user.id, difference);
        }
      )
    );
  }

  public async createAdminUser(adminUserCreate: AdminUserCreate): Promise<void> {
    await this.userResolver.createAdminUser(adminUserCreate);
  }

  public async removeAdminUser(id: string): Promise<void> {
    await this.userResolver.removeAdminUser(id);
  }

  public async createUser(userCreate: UserCreate): Promise<User> {
    const createdUser = await this.userResolver.createUser(userCreate);

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.USER,
      EntityActivityAction.CREATED,
      createdUser
    );

    return createdUser;
  }

  public async retrieveUserStats(id: string): Promise<UserStats> {
    const deviceStats = await this.deviceService.getStatsForUser(id);
    return {
      devices: deviceStats
    };
  }
}

export { UserService };
