import { HttpService } from '../../http/HttpService';
import { inject, injectable } from 'inversify';

@injectable()
class AccountSyncService extends HttpService {
  constructor(
    @inject('InternalFloMoenAuthUrl') private url: string
  ) {
    super();
  }

  public async getPing(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/ping`,
      proxyError: true
    };
    return this.sendRequest(request);
  }

  public async getTokenTrade(authToken: string): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/token/trade`,
      authToken,
      proxyError: true
    };
    return this.sendRequest(request);
  }

  public async headSyncMe(authToken: string): Promise<any> {
    const request = {
      method: 'HEAD',
      url: `${this.url}/sync/me`,
      authToken,
      proxyError: true
    };
    return this.sendRequest(request);
  }

  public async getSyncMe(authToken: string): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/sync/me`,
      authToken,
      proxyError: true
    };
    return this.sendRequest(request);
  }

  public async putSyncMe(authToken: string): Promise<any> {
    const request = {
      method: 'PUT',
      url: `${this.url}/sync/me`,
      authToken,
      proxyError: true
    };
    return this.sendRequest(request);
  }

  public async deleteSyncMe(authToken: string): Promise<any> {
    const request = {
      method: 'DELETE',
      url: `${this.url}/sync/me`,
      authToken,
      proxyError: true
    };
    return this.sendRequest(request);
  }

  public async postSyncNew(authToken: string, req: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${this.url}/sync/new`,
      authToken,
      proxyError: true,
      body: req
    };
    return this.sendRequest(request);
  }

  public async postSyncAuth(authToken: string, req: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${this.url}/sync/auth`,
      authToken,
      proxyError: true,
      body: req
    };
    return this.sendRequest(request);
  }

}

export { AccountSyncService };