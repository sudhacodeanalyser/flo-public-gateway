import { HttpService } from '../../http/HttpService';
import { inject, injectable } from 'inversify';

@injectable()
class AccountSyncService extends HttpService {
  constructor(
    @inject('InternalFloMoenAuthUrl') private url: string
  ) {
    super();
  }

  public async ping(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.url }/ping`,
    };
    return this.sendRequest(request);
  }

  public async getToken(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.url }/token`,
      authToken: this.authToken
    };
    return this.sendRequest(request);
  }

  public async getTokenTrade(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.url }/token/trade`,
      authToken: this.authToken
    };
    return this.sendRequest(request);
  }

  public async headSyncMe(): Promise<any> {
    const request = {
      method: 'HEAD',
      url: `${ this.url }/sync/me`,
      authToken: this.authToken
    };
    return this.sendRequest(request);
  }

  public async getSyncMe(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.url }/sync/me`,
      authToken: this.authToken
    };
    return this.sendRequest(request);
  }

  public async postSyncNew(req: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${ this.url }/sync/new`,
      authToken: this.authToken,
      body: req
    };
    return this.sendRequest(request);
  }

}

export { AccountSyncService };