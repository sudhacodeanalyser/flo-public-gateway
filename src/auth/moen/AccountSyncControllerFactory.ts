import { interfaces, httpHead, httpGet, httpPost, requestBody, request, BaseHttpController, httpPut, httpDelete, queryParam } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { httpController, createMethod, httpMethod } from '../../core/api/controllerUtils';
import Request from '../../core/api/Request';
import { AccountSyncService } from './AccountSyncService';
import AuthMiddlewareFactory from '../AuthMiddlewareFactory';
import UnauthorizedError from '../UnauthorizedError';
import HttpError from '../../http/HttpError';

export function AccountSyncControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');

  @httpController({ version: apiVersion }, '/moen')
  class AccountSyncController extends BaseHttpController {
    constructor(
      @inject('AccountSyncService') private accountSyncService: AccountSyncService
    ) {
      super();
    }

    @httpGet('/ping')
    private async getPing(@request() req: Request): Promise<any> {
      return this.accountSyncService.getPing();
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
      const deleteAccount: string = req.query.account?.toString() || 'false';

      return this.accountSyncService.deleteSyncMe(req.headers.authorization as string, deleteAccount);
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

    @httpMethod(
      'get',
      '/sync/id',
      authMiddlewareFactory.create(),
    )
    private async getSyncIds(
      @request() req: Request,
      @queryParam('moenId') moenId?: string,
      @queryParam('floId') floId?: string,
      @queryParam('issuer') issuer?: string): Promise<any> {

      if(!(moenId || floId)) {
        throw new HttpError(400, 'moenId or floId are required');
      }
      const e = assertAdminOrServiceToken(req);
      if(e) {
        throw e;
      }
      return this.accountSyncService.getSyncIds(floId, moenId, issuer);
    }

    @httpMethod(
      'get',
      '/sync/locations',
      authMiddlewareFactory.create(),
    )
    private async getSyncLocations(@request() req: Request): Promise<any> {
      const { moenId, floId, floAccountId } = req.query;
      if(!(moenId || floId || floAccountId)) {
        throw new HttpError(400, 'moenId, floId, or floAccountId are required');
      }
      const e = assertAdminOrServiceToken(req);
      if(e) {
        throw e;
      }
      return this.accountSyncService.getSyncLocations(req.query);
    }

    @httpMethod(
      'delete',
      '/sync/locations',
      authMiddlewareFactory.create(),
    )
    private async deleteSyncLocations(@request() req: Request): Promise<any> {
      const { moenId, floId, floAccountId } = req.body;
      if(!(moenId || floId || floAccountId)) {
        throw new HttpError(400, 'moenId, floId, or floAccountId are required');
      }
      const e = assertAdminOrServiceToken(req);
      if(e) {
        throw e;
      }
      return this.accountSyncService.deleteSyncLocations(req.body);
    }

    @httpMethod(
      'post',
      '/sync/locations',
      authMiddlewareFactory.create(),
    )
    private async postSyncLocations(@request() req: Request, @requestBody() body: any): Promise<any> {
      const e = assertAdminOrServiceToken(req);
      if(e) {
        throw e;
      }
      return this.accountSyncService.setSyncLocations(body);
    }
  }
  return AccountSyncControllerFactory;
}

function assertAdminOrServiceToken(req: Request): Error|undefined {
  const tokenMetadata = req.token;
  if (!tokenMetadata || !(tokenMetadata.isAdmin() || tokenMetadata.isService())) {
    return new UnauthorizedError();
  }
  return undefined;
}