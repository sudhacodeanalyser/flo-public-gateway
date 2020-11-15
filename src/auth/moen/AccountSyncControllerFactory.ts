import * as t from 'io-ts';
import { NewUserSyncValidator, HasAuthorizationValidator } from './AccountSync'
import { interfaces, httpHead, httpGet, httpPost, requestBody, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { httpController, createMethod } from '../../core/api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import Request from '../../core/api/Request';
import { AccountSyncService } from './AccountSyncService';

type NewUserSyncBody = t.TypeOf<typeof NewUserSyncValidator>;

export function AccountSyncControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: apiVersion }, '/moen')
  class AccountSyncController extends BaseHttpController {
    constructor(
      @inject('AccountSyncService') private accountSyncService: AccountSyncService
    ) {
      super();
    }

    @httpGet('/token',
      reqValidator.create(t.type({ header: HasAuthorizationValidator }))
    )
    private async getToken(@request() req: Request): Promise<any> {
      return this.accountSyncService.getToken();
    }

    @httpGet('/token/trade',
      reqValidator.create(t.type({ header: HasAuthorizationValidator }))
    )
    private async getTokenTrade(@request() req: Request): Promise<any> {
      return this.accountSyncService.getTokenTrade();
    }

    @httpHead('/sync/me',
      reqValidator.create(t.type({ header: HasAuthorizationValidator }))
    )
    private async getSyncMe(@request() req: Request): Promise<any> {
      return this.accountSyncService.getSyncMe();
    }

    @httpHead('/sync/me',
      reqValidator.create(t.type({ header: HasAuthorizationValidator }))
    )
    private async headSyncMe(@request() req: Request): Promise<any> {
      return this.accountSyncService.headSyncMe();
    }

    @httpPost('/sync/new',
      reqValidator.create(t.type({ header: HasAuthorizationValidator })),
      reqValidator.create(t.type({ body: NewUserSyncValidator }))
    )
    @createMethod
    private async postSyncNew(@request() req: Request, @requestBody() body: NewUserSyncBody): Promise<any> {
      return this.accountSyncService.postSyncNew(body);
    }
  }
  return AccountSyncControllerFactory;
}