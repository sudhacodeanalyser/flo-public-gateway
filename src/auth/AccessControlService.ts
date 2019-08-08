import { injectable, inject } from 'inversify';
import { HttpService } from '../http/HttpService';

@injectable()
class AccessControlService extends HttpService {

  constructor(
    @inject('AclUrl') private aclUrl: string
  ) {
    super();
  }

  public async refreshUser(authToken: string, userId: string): Promise<void> {
    const request = {
      method: 'POST',
      url: this.aclUrl,
      authToken,
      body: {
        user_id: userId
      }
    };

    await this.sendRequest(request);
  }
}

export { AccessControlService }