import _ from 'lodash';
import { injectable, inject } from 'inversify';
import { User, UserUpdate } from '../api/api';
import { UserResolver } from '../resolver';
import AccountService from '../account/AccountService';
import ResourceNotDeletableError from '../api/error/ResourceNotDeletableError';

@injectable()
class UserService {
  constructor(
    @inject('UserResolver') private userResolver: UserResolver,
    @inject('AccountService') private accountService: AccountService
  ) {}

  public async updatePartialUser(id: string, userUpdate: UserUpdate): Promise<User> {
    return this.userResolver.updatePartialUser(id, userUpdate);
  }

  public async getUserById(id: string, expand?: string[]): Promise<User | {}> {
    const user: User | null = await this.userResolver.getUserById(id, expand);

    return user === null ? {} : user;
  }

  public async removeUser(id: string): Promise<void> {
    const account = await this.accountService.getAccountByOwnerUserId(id);
    if (!_.isEmpty(account)) {
      throw new ResourceNotDeletableError('Cannot delete Account owner.');
    }

    return this.userResolver.removeUser(id);
  }
}

export default UserService;