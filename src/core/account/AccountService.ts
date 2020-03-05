import { injectable, inject } from 'inversify';
import { Account, AccountUserRole, UserInvite, UserCreate, PropExpand, DependencyFactoryFactory, User, InviteAcceptData } from '../api';
import { UserInviteService, InviteTokenData } from '../user/UserRegistrationService'
import { AccountResolver } from '../resolver';
import { Option, fromNullable } from 'fp-ts/lib/Option';
import NotFoundError from '../api/error/NotFoundError';
import UnauthorizedError from '../api/error/UnauthorizedError';
import ConflictError from '../api/error/ConflictError';
import ForbiddenError from '../api/error/ForbiddenError';
import { UserService, LocationService } from '../service';
import Logger from 'bunyan';
import { NonEmptyStringFactory } from '../api/validator/NonEmptyString';
import { EmailFactory } from '../api/validator/Email';

const sevenDays = 604800;

@injectable()
class AccountService {
  private userServiceFactory: () => UserService;
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('AccountResolver') private accountResolver: AccountResolver,
    @inject('UserInviteService') private userInviteService: UserInviteService,
    @inject('Logger') private logger: Logger,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
  ) {
    this.userServiceFactory = depFactoryFactory('UserService');
    this.locationServiceFactory = depFactoryFactory('LocationService');
  }

  public async getAccountById(id: string, expandProps?: PropExpand): Promise<Option<Account>> {
    const account: Account | null = await this.accountResolver.getAccount(id, expandProps);

    return fromNullable(account);
  }

  public async removeAccount(id: string): Promise<void> {

    return this.accountResolver.removeAccount(id);
  }

  public async updateAccountUserRole(id: string, userId: string, roles: string[]): Promise<AccountUserRole> {

    return this.accountResolver.updateAccountUserRole(id, userId, roles);
  }

  public async getAccountByOwnerUserId(ownerUserId: string): Promise<Account | {}> {
    const account = await this.accountResolver.getAccountByOwnerUserId(ownerUserId);
    return account === null ? {} : account;
  }

  public async inviteUserToJoinAccount(userInvite: UserInvite): Promise<{ token: string, metadata: InviteTokenData }> {
    const user = await this.userServiceFactory().getUserByEmail(userInvite.email);

    if (user) {
      throw new ConflictError('User already exists.');
    }

    return this.userInviteService.issueToken(
      userInvite.email, 
      { accountId: userInvite.accountId, roles: userInvite.accountRoles }, 
      userInvite.locationRoles,
      userInvite.locale,
      sevenDays
    );

    // TODO: Send email
  }

  public async resendInvitation(email: string): Promise<{ token: string, metadata: InviteTokenData }> {
    const user = await this.userServiceFactory().getUserByEmail(email);

    if (user) {
      throw new ConflictError('User already exists.');
    }

    const tokenData = await this.userInviteService.reissueToken(email, sevenDays);

    if (!tokenData) {
      throw new NotFoundError('Invitation not found.');
    }

    return tokenData;

    // TODO: Send email
  }

  public async getInvitationTokenByEmail(email: string): Promise<{ token: string, metadata: InviteTokenData }> {
    const tokenData = await this.userInviteService.getTokenByEmail(email);

    if (!tokenData) {
      throw new NotFoundError('Token not found.');
    }

    return tokenData;
  }

  public async acceptInvitation(token: string, data: InviteAcceptData): Promise<User> {
    let tokenData;

    try {
       tokenData = await this.userInviteService.verifyToken(token);
    } catch (err) {

      this.logger.error({ err });

      throw new UnauthorizedError('Invalid token.');
    }

    const user = await this.userServiceFactory().createUser({
      locale: tokenData.locale ? NonEmptyStringFactory.create(tokenData.locale) : undefined,
      account: { id: tokenData.userAccountRole.accountId },
      email: EmailFactory.create(tokenData.email),
      ...data 
    });
    const locationService = this.locationServiceFactory();

    await Promise.all([
      this.updateAccountUserRole(tokenData.userAccountRole.accountId, user.id, tokenData.userAccountRole.roles),
      ...tokenData.userLocationRoles.map(({ locationId, roles }) => 
        locationService.addLocationUserRole(locationId, user.id, roles)
      )
    ]);

    return user;
  }
}

export { AccountService };