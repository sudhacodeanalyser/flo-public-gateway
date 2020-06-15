import { fold, fromNullable, Option } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { PropExpand, UpdateAlarmSettings, User, UserUpdate, UserCreate, UserAccountRole, RetrieveAlarmSettingsFilter, EntityAlarmSettings, DeviceStats } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import ConflictError from '../api/error/ConflictError';
import { UserResolver } from '../resolver';
import { DeviceService, EntityActivityAction, EntityActivityService, EntityActivityType, AccountService } from '../service';

@injectable()
class UserService {
  constructor(
    @inject('UserResolver') private userResolver: UserResolver,
    @inject('AccountService') private accountService: AccountService,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService,
    @inject('DeviceService') private deviceService: DeviceService
  ) {}

  public async updatePartialUser(id: string, userUpdate: UserUpdate): Promise<User> {
    const updatedUser = await this.userResolver.updatePartialUser(id, userUpdate);

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.USER,
      EntityActivityAction.UPDATED,
      updatedUser
    );

    return updatedUser;
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

  public isUserAccountOwner(user: User): boolean {
    return _.includes(user.accountRole.roles, 'owner');
  }

  public async updateAlarmSettings(id: string, settings: UpdateAlarmSettings): Promise<void> {
    return this.userResolver.updateAlarmSettings(id, settings);
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

  public async createUser(userCreate: UserCreate): Promise<User> {
    const createdUser = await this.userResolver.createUser(userCreate);

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.USER,
      EntityActivityAction.CREATED,
      createdUser
    );

    return createdUser;
  }

  public async retrieveUserStats(id: string): Promise<DeviceStats> {
    return this.deviceService.getStatsForUser(id);
  }
}

export { UserService };
