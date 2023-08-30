import * as t from 'io-ts';
import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { AccountService, UserService } from '../service';
import { parseExpand, httpController, deleteMethod, withResponseType } from '../api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AccountMergeValidator, AccountMerge, AccountMutable, AccountMutableCodec, Account, AccountUserRole, UserInviteCodec,
  InviteAcceptValidator, InviteAcceptData, User, PendingInvitesRequest, PendingInvitesDataCodec, UserRegistrationPendingTokenMetadata } from '../api';
import { InviteTokenData } from '../user/UserRegistrationService';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import * as O from 'fp-ts/lib/Option';
import * as Responses from '../api/response';
import * as _ from 'lodash';
import UnauthorizedError from '../api/error/UnauthorizedError';
import NotFoundError from '../api/error/NotFoundError';
import { getEventInfo } from '../api/eventInfo';

const { some, none } = O;
type Option<T> = O.Option<T>;
const {
  accountId: accountIdValidator, // ignore
  email: emailValidator,
  ...userInviteProps
} = UserInviteCodec.props;

const UserInviteValidator = t.type({
  ...userInviteProps,
  accountId: accountIdValidator,
  email: emailValidator
});

type UserInviteBody = t.TypeOf<typeof UserInviteValidator>;

export function AccountControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authAdmin = authMiddlewareFactory.create();
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ account_id: id }));
  const authWithIdBody = authMiddlewareFactory.create(async ({ body: { accountId } }: Request) => ({ account_id: accountId }));
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/accounts')
  class AccountController extends BaseHttpController {
    constructor(
      @inject('AccountService') private accountService: AccountService,
      @inject('UserService') private userService: UserService
    ) {
      super();
    }

    @httpPost('/invite',
      authWithIdBody,
      reqValidator.create(t.type({
        body: UserInviteValidator
      }))
    )
    private async inviteUserToAccount(@request() req: Request, @requestBody() body: UserInviteBody): Promise<void> {
      const resourceEventInfo = getEventInfo(req);

      await this.accountService.inviteUserToJoinAccount(req, body, resourceEventInfo);
    }

    @httpPost('/invite/revoke',
      authWithIdBody,
      reqValidator.create(t.type({
        body: t.type({
          accountId: accountIdValidator,
          email: emailValidator
        })
      }))
    )
    private async revokeInvitation(@requestBody() { email }: { email: string }): Promise<void> {
      await this.accountService.revokeInvitation(email);
    }

    @httpPost('/invite/resend',
      authWithIdBody,
      reqValidator.create(t.type({
        body: t.partial({
          accountId: accountIdValidator,
          email: emailValidator,
        })
      }))
    )
    private async resendInvitation(@requestBody() body: { email: string }): Promise<void> {
      await this.accountService.resendInvitation(body.email);
    }

    @httpPost('/invite/accept',
      reqValidator.create(t.type({
        body: InviteAcceptValidator
      }))
    )
    private async acceptInvite(@request() req: Request, @requestBody() body: InviteAcceptData): Promise<User> {
      const resourceEventInfo = getEventInfo(req);

      const token = req.get('Authorization');
      const tokenStr = token && token.split(' ')[1];

      if (!token || !tokenStr) {
        throw new UnauthorizedError();
      }

      return this.accountService.acceptInvitation(tokenStr, body, resourceEventInfo);
    }

    @httpGet('/invite/token',
      async (req, res, next) => {

        if (req.query.token) {
          next();
        } else {
          auth(req, res, next);
        }

      },
      reqValidator.create(t.type({
        query: t.union([
          t.type({
            email: emailValidator
          }),
          t.type({
            token: t.string
          })
        ])
      }))
    )
    private async getInviteToken(@request() req: Request, @queryParam('email') email?: string,  @queryParam('token') token?: string): Promise<{ token: string, metadata: InviteTokenData }> {
      const tokenData = email !== undefined ?
        await this.accountService.getInvitationTokenByEmail(email) :
        token && {
          token,
          metadata: (await this.accountService.validateInviteToken(token))
        };

      if (!tokenData) {
        throw new NotFoundError();
      }

      return tokenData;
    }

    @httpPost(
      '/invite/pending',
      authAdmin,
      async (req, res, next) => {
        next();
      },
      reqValidator.create(t.type({
        body: PendingInvitesDataCodec
      }))
    )
    private async getAllPending(@request() req: Request,  @requestBody() body: PendingInvitesRequest): Promise<{items: UserRegistrationPendingTokenMetadata[], next?: string }> {
      const pendingInviteData = await this.accountService.getAllPendingUserInvites(body.size, body.next);
      return pendingInviteData;
    }

    // Warning this operation is NOT ATOMIC, if there is any failure mid-operation, then there is a high
    // likelihood of data loss or corruption. Ensure all data is backed up before performing this operation.
    @httpPost('/merge',
      auth,
      reqValidator.create(t.type({
        body: AccountMergeValidator
      }))
    )
    private async mergeAccounts(@request() req: Request,@requestBody() merge: AccountMerge): Promise<Account> {
      const resourceEventInfo = getEventInfo(req);
      return this.accountService.mergeAccounts(merge, resourceEventInfo);
    }

    @httpGet('/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<Account, Responses.AccountResponse>(Responses.Account.fromModel)
    private async getAccount(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<Account>> {
      const expandProps = parseExpand(expand);

      return this.accountService.getAccountById(id, expandProps);
    }

    @httpPost('/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: AccountMutableCodec
      }))
    )
    @withResponseType<Account, Responses.AccountResponse>(Responses.Account.fromModel)
    private async updateAccount(@requestParam('id') id: string, @requestBody() accountUpdate: AccountMutable): Promise<Option<Account>> {

      return O.some(await this.accountService.updateAccount(id, accountUpdate));
    }

    @httpDelete('/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async removeAccount(@requestParam('id') id: string): Promise<void> {

      return this.accountService.removeAccount(id);
    }

    @httpPost('/:id/user-roles/:userId',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          userId: t.string
        }),
        body: t.strict({
          roles: NonEmptyArray(t.string)
        })
      }))
    )
    @deleteMethod
    private async updateAccountUserRole(@requestParam('id') id: string, @requestParam('userId') userId: string, @requestBody() { roles }: Pick<AccountUserRole, 'roles'>): Promise<AccountUserRole> {

      return this.accountService.updateAccountUserRole(id, userId, roles);
    }


  }

  return AccountController;
}
