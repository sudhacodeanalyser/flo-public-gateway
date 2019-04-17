import { injectable, inject } from 'inversify';
import Logger from 'bunyan';
import { User } from '../api/api';
import { UserResolver } from '../resolver';

@injectable()
class UserService {
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('UserResolver') private userResolver: UserResolver
  ) {}

  public async getUserById(id: string, expand?: string[]): Promise<User | {}> {
    const user: User | null = await this.userResolver.get(id, expand);

    return user === null ? {} : user;
  }
}

export default UserService;