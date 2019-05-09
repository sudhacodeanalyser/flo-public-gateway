import * as t from 'io-ts';
import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import AccountService from './AccountService';
import { parseExpand, httpController, deleteMethod } from '../api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Account, AccountUserRole } from '../api/api';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';

export function AccountControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ account_id: id }));

  @httpController({ version: apiVersion }, '/accounts')
  class AccountController extends BaseHttpController {
    constructor(
      @inject('AccountService') private accountService: AccountService
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
    private async getAccount(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Account | {}> {
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
  }

  return AccountController;
}