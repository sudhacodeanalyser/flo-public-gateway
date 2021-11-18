import { HttpService } from '../../http/HttpService';
import { injectable, inject } from 'inversify';

@injectable()
class AlarmDotcomService extends HttpService {
  constructor(
    @inject('InternalFloAlarmDotcomUrl') private url: string
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

  public async postFulfillment(authToken: string, body: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${this.url}/fulfillment`,
      authToken,
      proxyError: true,
      body,
    };
    return this.sendRequest(request);
  }

  public async getJWK(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${this.url}/jwk`,
      proxyError: true,
    };
    return this.sendRequest(request);
  }
}

export { AlarmDotcomService }