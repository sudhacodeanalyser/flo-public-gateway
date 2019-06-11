import { ApiV1Service } from '../ApiV1Service';
import { DirectiveService } from '../../core/device/DirectiveService';

export class ApiV1DirectiveService extends ApiV1Service implements DirectiveService {
    constructor(
    private readonly apiV1Url: string,
    private readonly authToken: string
  ) {
    super();
  }

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
}