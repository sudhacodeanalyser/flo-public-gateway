import { injectable } from 'inversify';
import { DirectiveService } from '../../core/device/DirectiveService';
import { HttpService } from '../../http/HttpService';

@injectable()
class ApiV1DirectiveService extends HttpService implements DirectiveService {
  public apiV1Url: string;
  public authToken: string;

  public async openValve(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/directives/icd/${ id }/openvalve`,
      authToken: this.authToken
    };

    await this.sendRequest(request);
  }

  public async closeValve(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/directives/icd/${ id }/closevalve`,
      authToken: this.authToken
    };

    await this.sendRequest(request);
  }

  public async reboot(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/directives/icd/${ id }/powerreset`,
      authToken: this.authToken
    }

    await this.sendRequest(request);
  }
}

export { ApiV1DirectiveService };