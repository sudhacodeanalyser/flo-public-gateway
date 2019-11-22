import { injectable, inject } from 'inversify';
import { PasswordResetService } from '../../core/user/PasswordResetService';
import { HttpService } from '../../http/HttpService';

@injectable()
class ApiV1PasswordResetService extends HttpService implements PasswordResetService {

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

  public async resetPassword(authToken: string, userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/users/${ userId }/resetpassword`,
      authToken,
      body: {
        old_pass: oldPassword,
        new_pass: newPassword,
        new_pass_conf: newPassword
      }
    };

    await this.sendRequest(request);
  }
}

export { ApiV1PasswordResetService };

