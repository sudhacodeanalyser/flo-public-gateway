import _ from 'lodash';
import { injectable, inject } from 'inversify';
import {User, UserUpdate, PropExpand, UpdateDeviceAlarmSettings} from '../api';
import { UserResolver } from '../resolver';
import {AccountService} from '../service';
import ValidationError from '../api/error/ValidationError';
import { Option, fromNullable } from 'fp-ts/lib/Option';

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
}

export { UserService };