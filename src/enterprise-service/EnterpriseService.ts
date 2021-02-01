import { injectable, inject } from 'inversify';
import { HttpService } from '../http/HttpService';

@injectable()
class EnterpriseService extends HttpService {
  @inject('EnterpriseServiceURL') private readonly enterpriseServiceUrl: string;

  public async forward(method: string, path: string, payload?: any): Promise<any> {
    const request = {
      method,
      url: `${this.enterpriseServiceUrl}/devices/${path}`,
      body: payload
    };

    return this.sendRequest(request);
  }

  public async syncDevice(macAddress: string): Promise<any> {
    return this.forward('POST', `${macAddress}/sync`);
  }
}

export { EnterpriseService };