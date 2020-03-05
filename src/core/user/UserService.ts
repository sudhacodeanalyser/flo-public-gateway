import { fold, fromNullable, Option } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { PropExpand, UpdateDeviceAlarmSettings, User, UserUpdate, UserCreate, UserAccountRole } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import ValidationError from '../api/error/ValidationError';
import { UserResolver } from '../resolver';
import { AccountService } from '../service';

@injectable()
class UserService {
  constructor(
    @inject('UserResolver') private userResolver: UserResolver,
    @inject('AccountService') private accountService: AccountService
  ) {}

  public async updatePartialUser(id: string, userUpdate: UserUpdate): Promise<User> {
    return this.userResolver.updatePartialUser(id, userUpdate);
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

    return this.userResolver.removeUser(id);
  }

  public isUserAccountOwner(user: User): boolean {
    return _.includes(user.accountRole.roles, 'owner');
  }

  public async updateAlarmSettings(id: string, settings: UpdateDeviceAlarmSettings): Promise<void> {
    return this.userResolver.updateAlarmSettings(id, settings);
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
    return this.userResolver.createUser(userCreate);
  }
}

export { UserService };

