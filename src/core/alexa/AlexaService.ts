import { HttpService } from '../../http/HttpService';
import { injectable, inject } from 'inversify';

@injectable()
class AlexaService extends HttpService {
  constructor(
    @inject('InternalFloAlexaSmarthomeUrl') private url: string
  ) {
    super();
  }

  public async getPing(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/ping`,
      proxyError: true,
    };
    return this.sendRequest(request);
  }

  public async getClientInfo(authToken: string): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/app/alexa/client`,
      authToken,
      proxyError: true,
    };
    return this.sendRequest(request);
  }

  public async getAuthorizeScopes(authToken: string, query: any): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/app/alexa/authorize`,
      authToken,
      proxyError: true,
      params: query,
    };
    return this.sendRequest(request);
  }

  public async postAuthorizeConfirm(authToken: string, query: any, body: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${this.url}/app/alexa/authorize`,
      authToken,
      proxyError: true,
      body,
      params: query,
    };
    return this.sendRequest(request);
  }

  public async getAccountLink(authToken: string, userId: string, deep: boolean): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/users/${userId}/alexa`,
      authToken,
      proxyError: true,
    };
    if(deep) {
      request.url += '?deep=true';
    }
    return this.sendRequest(request);
  }

  public async postAccountLink(authToken: string, userId: string, body: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${this.url}/users/${userId}/alexa`,
      authToken,
      proxyError: true,
      body,
    };
    return this.sendRequest(request);
  }

  public async deleteAccountLink(authToken: string, userId: string, force: boolean): Promise<void> {
    const request = {
      method: 'DELETE',
      url: `${this.url}/users/${userId}/alexa`,
      authToken,
      proxyError: true,
    };
    if(force) {
      request.url += '?force=true';
    }
    return this.sendRequest(request);
  }
}

export { AlexaService };