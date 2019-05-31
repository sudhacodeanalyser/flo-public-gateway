import { inject, injectable } from 'inversify';
import { ApiV1Service } from '../ApiV1Service';
import { PasswordResetService } from '../../core/user/PasswordResetService';

class ApiV1PasswordResetService extends ApiV1Service implements PasswordResetService {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string
  ) {
    super();
  }

  public async requestReset(email: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/users/requestreset/user`,
      body: {
        email
      }
    };

    await this.sendRequest(request);
  }
}

export { ApiV1PasswordResetService };