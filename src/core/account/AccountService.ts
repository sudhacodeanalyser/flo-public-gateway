import { injectable, inject } from 'inversify';
import { AccountMerge, AccountMutable, Account, AccountUserRole, UserInvite, PropExpand, DependencyFactoryFactory, User, InviteAcceptData, AccountStatus } from '../api';
import { UserInviteService, InviteTokenData } from '../user/UserRegistrationService';
import { AccountResolver } from '../resolver';
import { Option, fromNullable, toNullable } from 'fp-ts/lib/Option';
import NotFoundError from '../api/error/NotFoundError';
import UnauthorizedError from '../api/error/UnauthorizedError';
import ConflictError from '../api/error/ConflictError';
import ForbiddenError from '../api/error/ForbiddenError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { UserService, LocationService, LocalizationService } from '../service';
import Logger from 'bunyan';
import { NonEmptyStringFactory } from '../api/validator/NonEmptyString';
import { EmailFactory } from '../api/validator/Email';
import _ from 'lodash';
import { NotificationService } from '../notification/NotificationService';
import uuid from 'uuid';
import EmailClient from '../../email/EmailClient';
import config from '../../config/config';

const sevenDays = 604800;

@injectable()
class AccountService {
  private userServiceFactory: () => UserService;
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('AccountResolver') private accountResolver: AccountResolver,
    @inject('UserInviteService') private userInviteService: UserInviteService,
    @inject('NotificationService') private notificationService: NotificationService,
    @inject('Logger') private logger: Logger,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('EmailClient') private emailClient: EmailClient,
    @inject('LocalizationService') private localizationService: LocalizationService,
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

    const locationService = this.locationServiceFactory();

    await Promise.all(
      userInvite.locationRoles.map(async ({ locationId }) => {
        const location = toNullable(await locationService.getLocation(locationId, {
          $select: {
            account: {
              $select: {
                id: true
              }
            }
          }
        }));

        if (!location) {
          throw new ResourceDoesNotExistError('Location not found.');
        } else if (location.account.id !== userInvite.accountId) {
          throw new ForbiddenError('Forbidden.');
        }
      })
    );

    const tokenData = await this.userInviteService.issueToken(
      userInvite.email, 
      { accountId: userInvite.accountId, roles: userInvite.accountRoles }, 
      userInvite.locationRoles,
      userInvite.locale,
      sevenDays
    );

    const isOwner = !userInvite.accountId;

    await this.userInviteService.sendInvite(userInvite.email, tokenData.token, userInvite.locale, isOwner);

    try {
      await this.notifyUserInvited(tokenData.metadata);
    } catch (err) {
      // fail with log so that notification does not interrupt user invite experience
      this.logger.error(`Failed to send notify user invited for user ${tokenData.metadata.email}`, err);
    }

    return tokenData;
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
  
    const isOwner = tokenData.metadata.userAccountRole.roles.includes('owner');

    await this.userInviteService.sendInvite(tokenData.metadata.email, tokenData.token, tokenData.metadata.locale, isOwner);

    return tokenData;
  }

  public async getInvitationTokenByEmail(email: string): Promise<{ token: string, metadata: InviteTokenData }> {
    const tokenData = await this.userInviteService.getTokenByEmail(email);

    if (!tokenData) {
      throw new NotFoundError('Token not found.');
    }

    return tokenData;
  }

  public async acceptInvitation(token: string, data: InviteAcceptData): Promise<User> {
    const tokenData = await this.userInviteService.redeemToken(token);
    const accountId = tokenData.userAccountRole.accountId || uuid.v4();

    const user = await this.userServiceFactory().createUser({
      locale: tokenData.locale ? NonEmptyStringFactory.create(tokenData.locale) : undefined,
      account: { id: accountId },
      email: EmailFactory.create(tokenData.email),
      ...data 
    });

    if (!tokenData.userAccountRole.accountId) {
      await this.createAccount(accountId, user.id);
      try {
        await this.notifyAccountCreated(tokenData)
      } catch (err) {
        // fail with log so that notification does not interrupt user registration experience
        this.logger.error(`Failed to send notify user invited for user ${tokenData.email}`, err);
      }
    }

    const locationService = this.locationServiceFactory();

    await Promise.all([
      this.updateAccountUserRole(accountId, user.id, tokenData.userAccountRole.roles),
      ...tokenData.userLocationRoles.map(({ locationId, roles }) => 
        locationService.addLocationUserRole(locationId, user.id, roles, false)
      )
    ]);

    return user;
  }

  public async validateInviteToken(token: string): Promise<InviteTokenData> {
    try {
      const {
        isExpired,
        ...tokenData
      } = await this.userInviteService.decodeToken(token);

      if (isExpired) {
        throw new UnauthorizedError('Token expired.');
      }

      return tokenData;
    } catch (err) {
      this.logger.error({ err });
      throw new UnauthorizedError('Invalid token.');
    }
  }

  public async revokeInvitation(email: string): Promise<void> {
    return this.userInviteService.revoke(email);
  }

  public async updateAccount(id: string, accountUpdate: AccountMutable): Promise<Account> {
    return this.accountResolver.updatePartial(id, accountUpdate);
  }

  public async mergeAccounts({ destAccountId, sourceAccountId, locationMerge }: AccountMerge): Promise<Account> {
    const srcAccount = toNullable(await this.getAccountById(sourceAccountId));
    const destAccount = toNullable(await this.getAccountById(destAccountId));

    if (!srcAccount || !destAccount || !srcAccount?.owner?.id || !destAccount?.owner?.id) {
      throw new NotFoundError('Account not found.');
    }

    const sourceOwnerUserId = srcAccount.owner.id;
    const locationService = this.locationServiceFactory();

    const { items: locations } = await locationService.getByUserId(sourceOwnerUserId, {
      $select: {
        id: true
      }
    });

    if (locationMerge) {     
      const sourceLocationIds = new Set(locations.map(l => l.id))
      const invalidSourceLocations = locationMerge
        .filter(({ sourceLocationId }) => !sourceLocationIds.has(sourceLocationId));

      if (invalidSourceLocations.length) {
        throw new ConflictError(`Some source locations do not belong to source account ${sourceAccountId}: ${JSON.stringify(invalidSourceLocations)}`);
      }

      const destLocationIds = new Set(await this.getAllUnitLocations(destAccount.owner.id));
      const invalidDestLocations = locationMerge
        .filter(({ destLocationId }) => !destLocationIds.has(destLocationId));

      if (invalidDestLocations.length) {
        throw new ConflictError(`Some destination locations do not belong to destination account ${destAccountId}: ${JSON.stringify(invalidDestLocations)}`);
      }

      await Promise.all(
        locationMerge
          .map(({ sourceLocationId, destLocationId }) => 
            locationService.transferDevices(destLocationId, sourceLocationId)
          )
      );

      await Promise.all(
        locationMerge
          .map(({ sourceLocationId, destLocationId }) => 
            this.notificationService.moveEvents(sourceAccountId, destAccountId, sourceLocationId, destLocationId)
          )
      );
    } else {
      const locationMappingPairs = await Promise.all(
        locations
          .map(async ({ id }) => {
            const l = await locationService.transferLocation(destAccountId, id)
            return [id, l.id]
          })
      );
  
      await Promise.all(
        locationMappingPairs
          .map(([sourceLocationId, destLocationId]: string[]) => 
            this.notificationService.moveEvents(sourceAccountId, destAccountId, sourceLocationId, destLocationId)
          )
      )
    }

    const updatedDestAccount = toNullable(await this.getAccountById(destAccountId));

    // If the account has disappeared, something has gone terribly wrong
    if (!updatedDestAccount) {
      throw new Error('Destination account not found.');
    }

    return updatedDestAccount; 
  }

  private async getAllUnitLocations(userId: string): Promise<string[]> {
    const locationService = this.locationServiceFactory();

    const pageThruLocations = async (pageNum: number = 1, pageSize: number = 100): Promise<string[]> => {
      const { total, items } = await locationService.getByUserId(userId, {
        $select: {
          id: true
        }
      }, pageSize, pageNum, { locClass: ['unit'] });
      const locationIds = items.map(l => l.id);

      if (((pageNum - 1) * pageSize) + items.length < total) {
        return [
          ...locationIds,
          ...await pageThruLocations(pageNum + 1, pageSize)
        ]
      }
      return locationIds;
    } 

    return pageThruLocations();
  }

  private async createAccount(accountId: string, ownerUserId: string): Promise<Account> {
    return this.accountResolver.createAccount(accountId, ownerUserId);
  }

  private async notifyUserInvited(tokenMetadata: InviteTokenData): Promise<void> {
    if (!tokenMetadata.userAccountRole.accountId) {
      const { items: [{ value: templateId }]} = await this.localizationService.getAssets({ name: 'enterprise.account-status.moen.template', type: 'email', locale: 'en-us' });
      await this.emailClient.send(config.defaultNotifyAccountRegistrationActivityEmail, templateId, { email: tokenMetadata.email, status: AccountStatus.USER_INVITED });
    }
  }

  private async notifyAccountCreated(tokenMetadata: InviteTokenData): Promise<void> {
    if(!tokenMetadata.userAccountRole.accountId) {
      const { items: [{ value: templateId }]} = await this.localizationService.getAssets({ name: 'enterprise.account-status.moen.template', type: 'email', locale: 'en-us' });
      await this.emailClient.send(config.defaultNotifyAccountRegistrationActivityEmail, templateId, { email: tokenMetadata.email, status: AccountStatus.ACCOUNT_CREATED });
    }
  }
}

export { AccountService };