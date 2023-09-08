import { injectable, inject} from 'inversify';
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

    if (authToken) {
       const request = {
          method: 'POST',
          url: authToken.toLowerCase().includes('bearer') ? 
            `${ this.apiV1Url }/logout` : 
            `${ this.apiV1Url }/users/logout`,
          authToken
      };

      await this.sendRequest(request);
    }
  }

}

export { ApiV1LogoutService };