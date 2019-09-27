import { inject, injectable } from 'inversify';
import { ExternalPresenceService } from '../core/presence/ExternalPresenceService';
import { HttpService } from '../http/HttpService';
import { PresenceData } from '../core/api/model/Presence';


@injectable()
class ApiExternalPresenceService extends HttpService implements ExternalPresenceService {
  constructor(
    @inject('PresenceServiceUrl') private presenceServiceUrl: string
  ) {
    super();
  }

  public async getHistory(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.presenceServiceUrl }/history`
    };

    return this.sendRequest(request);
  }

  public async getNow(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.presenceServiceUrl }/now`
    };

    return this.sendRequest(request);
  }

  public async getByUserId(userId: string): Promise<any> {
    const request = {
      method: 'GET',
      url: this.presenceServiceUrl,
      params: {
        userId
      }
    };

    return this.sendRequest(request);
  }

  public async report(data: PresenceData): Promise<PresenceData> {
    const request = {
      method: 'POST',
      url: this.presenceServiceUrl,
      body: data
    };

    await this.sendRequest(request);

    return data;
  }
}

export { ApiExternalPresenceService }