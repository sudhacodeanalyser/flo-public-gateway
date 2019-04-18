import _ from 'lodash';
import Logger from 'bunyan';
import { injectable, inject } from 'inversify';
import { User } from '../api/api';
import { UserResolver } from '../resolver';
import AccountService from '../account/AccountService';
import ResourceNotDeletableError from '../api/error/ResourceNotDeletableError';

@injectable()
class UserService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('UserResolver') private userResolver: UserResolver,
    @inject('AccountService') private accountService: AccountService
  ) {}

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