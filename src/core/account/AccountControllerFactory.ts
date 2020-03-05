import * as t from 'io-ts';
import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { AccountService, UserService } from '../service';
import { parseExpand, httpController, deleteMethod, withResponseType } from '../api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Account, AccountUserRole, UserInviteCodec, UserCreate, InviteAcceptValidator, InviteAcceptData, User } from '../api';
import { InviteTokenData } from '../user/UserRegistrationService';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import * as O from 'fp-ts/lib/Option';
import * as Responses from '../api/response';
import _ from 'lodash';
import UnauthorizedError from '../api/error/UnauthorizedError';
import ForbiddenError from '../api/error/ForbiddenError';
import NotFoundError from '../api/error/NotFoundError';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TO from 'fp-ts-contrib/lib/TaskOption';

const { some, none } = O;
type Option<T> = O.Option<T>;
const {
  accountId: accountIdValidator, // ignore
  email: emailValidator,
  ...userInviteProps
} = UserInviteCodec.props;

const UserInviteValidator = t.strict({ ...userInviteProps, email: emailValidator });

type UserInviteBody = t.TypeOf<typeof UserInviteValidator>;

export function AccountControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ account_id: id }));
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/accounts')
  class AccountController extends BaseHttpController {
    constructor(
      @inject('AccountService') private accountService: AccountService,
      @inject('UserService') private userService: UserService
    ) {
      super();
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

    @httpPost('/invite',
      auth,
      reqValidator.create(t.type({
        body: UserInviteValidator
      }))
    )
    private async inviteUserToAccount(@request() req: Request, @requestBody() body: UserInviteBody): Promise<void> {
      const tokenMetadata = req.token;

      if (!tokenMetadata || !tokenMetadata.user_id) {
        throw new UnauthorizedError();
      }
      
      await pipe(
        await this.userService.getUserById(tokenMetadata.user_id, { $select: { account: true } }),
        O.fold(
          async () => { throw new Error('User does not exist.'); },
          async ({ account: { id } }) => 
            this.accountService.inviteUserToJoinAccount({
              accountId: id,
              ...body
            })
        )
      );
    }

    @httpPost('/invite/resend',
      auth,
      reqValidator.create(t.type({
        body: t.type({
          emailValidator
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
      const token = req.get('Authorization');
      const tokenStr = token && token.split(' ')[1];

      if (!token || !tokenStr) {
        throw new UnauthorizedError();
      }

      return this.accountService.acceptInvitation(tokenStr, body);
    }

    @httpGet('/invite/token',
      auth,
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
      const tokenMetadata = req.token;

      if (!tokenMetadata || !tokenMetadata.user_id) {
        throw new UnauthorizedError();
      }
      
      return pipe(
        async () => _.find(tokenMetadata.roles, 'system.admin') ?
          Promise.resolve(O.some(undefined)):
          this.userService.getUserById(tokenMetadata.user_id, { $select: { account: true } }) as Promise<Option<User | undefined>>,
        TO.fold(
          () => { throw new Error('User not found.'); },
          (result) => async () => {
            const tokenData = email !== undefined ? 
              await this.accountService.getInvitationTokenByEmail(email) :
              token && {
                token,
                metadata: (await this.accountService.validateInviteToken(token))
              };

            if (!tokenData) {
              throw new NotFoundError();
            }

            if (result) {
              const { account: { id: accountId } } = result;

              if (tokenData.metadata.userAccountRole.accountId !== accountId) {
                throw new ForbiddenError();
              }
            }

            return tokenData;
          })
      )();
    }
  }

  return AccountController;
}