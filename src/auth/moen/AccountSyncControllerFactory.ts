import { interfaces, httpHead, httpGet, httpPost, requestBody, request, BaseHttpController, httpPut, httpDelete } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { httpController, createMethod } from '../../core/api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import Request from '../../core/api/Request';
import { AccountSyncService } from './AccountSyncService';

export function AccountSyncControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: apiVersion }, '/moen')
  class AccountSyncController extends BaseHttpController {
    constructor(
      @inject('AccountSyncService') private accountSyncService: AccountSyncService
    ) {
      super();
    }

    @httpGet('/token/trade')
    private async getTokenTrade(@request() req: Request): Promise<any> {
      return this.accountSyncService.getTokenTrade(req.headers.authorization as string);
    }

    @httpHead('/sync/me')
    private async headSyncMe(@request() req: Request): Promise<any> {
      return this.accountSyncService.headSyncMe(req.headers.authorization as string);
    }

    @httpGet('/sync/me')
    private async getSyncMe(@request() req: Request): Promise<any> {
      return this.accountSyncService.getSyncMe(req.headers.authorization as string);
    }

    @httpPut('/sync/me')
    private async putSyncMe(@request() req: Request): Promise<any> {
      return this.accountSyncService.putSyncMe(req.headers.authorization as string);
    }

    @httpDelete('/sync/me')
    private async deleteSyncMe(@request() req: Request): Promise<any> {
      return this.accountSyncService.deleteSyncMe(req.headers.authorization as string);
    }

    @createMethod
    @httpPost('/sync/new')
    private async postSyncNew(@request() req: Request, @requestBody() body: any): Promise<any> {
      return this.accountSyncService.postSyncNew(req.headers.authorization as string, body);
    }

    @httpPost('/sync/auth')
    private async postSyncAuth(@request() req: Request, @requestBody() body: any): Promise<any> {
      return this.accountSyncService.postSyncAuth(req.headers.authorization as string, body);
    }
  }
  return AccountSyncControllerFactory;
}