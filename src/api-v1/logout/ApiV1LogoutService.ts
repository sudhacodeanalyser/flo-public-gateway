import { injectable, inject} from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import { HttpService } from '../../http/HttpService';

@injectable()
class ApiV1LogoutService extends HttpService {
  constructor(
    @inject('ApiV1Url') public readonly apiV1Url: string
  ) {
    super();
  }

  public async logout(): Promise<void> {    
    const authToken = this.httpContext?.request?.get('Authorization');
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/logout`,
      authToken
    };
    
    await this.sendRequest(request);
  }

}

export { ApiV1LogoutService };