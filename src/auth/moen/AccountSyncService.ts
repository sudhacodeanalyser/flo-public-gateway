import { HttpService } from '../../http/HttpService';
import { inject, injectable } from 'inversify';

@injectable()
class AccountSyncService extends HttpService {
  constructor(
    @inject('InternalFloMoenAuthUrl') private url: string
  ) {
    super();
  }

  public async getToken(authToken: string): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/token`,
      authToken
    };
    return this.sendRequest(request);
  }

  public async getTokenTrade(authToken: string): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/token/trade`,
      authToken
    };
    return this.sendRequest(request);
  }

  public async headSyncMe(authToken: string): Promise<any> {
    const request = {
      method: 'HEAD',
      url: `${this.url}/sync/me`,
      authToken
    };
    return this.sendRequest(request);
  }

  public async getSyncMe(authToken: string): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/sync/me`,
      authToken
    };
    return this.sendRequest(request);
  }

  public async postSyncNew(authToken: string, req: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${this.url}/sync/new`,
      authToken,
      body: req
    };
    return this.sendRequest(request);
  }

}

export { AccountSyncService };