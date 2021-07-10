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

  public async getAccountLink(authToken: string, userId: string, deep: boolean): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/user/${userId}/alexa`,
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
      method: 'GET',
      url: `${this.url}/user/${userId}/alexa`,
      authToken,
      proxyError: true,
      body,
    };
    return this.sendRequest(request);
  }

  public async deleteAccountLink(authToken: string, userId: string, force: boolean): Promise<any> {
    const request = {
      method: 'DELETE',
      url: `${this.url}/user/${userId}/alexa`,
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