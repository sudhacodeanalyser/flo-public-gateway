import { inject, injectable } from 'inversify';
import { HttpService } from '../../http/HttpService';
import HttpError from '../../http/HttpError';
import { EmailAvailabilityCodec } from './models';
import { UserRegistrationData, EmailAvailability, UserRegistrationService, EmailVerification, OAuth2Response, OAuth2ResponseCodec } from '../../core/user/UserRegistrationService';

import _ from 'lodash';

@injectable()
class ApiV1UserRegistrationService extends HttpService implements UserRegistrationService {
  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string
  ) {
    super();
  }

  public async acceptTermsAndVerifyEmail(data: UserRegistrationData): Promise<void> {
    try {
      const request = {
        method: 'POST',
        url: `${ this.apiV1Url }/userregistration`,
        body: {
          ..._.pick(
            data, 
            [
              'email',
              'password',
              'country'
            ]
          ),
          firstname: data.firstName,
          lastname: data.lastName,
          password_conf: data.password,
          phone_mobile: data.phone
        }
      };
      
      await this.sendRequest(request);
    } catch (err) {
      // Translate HTTP 400 'Email already registered.' error into a 409 for consistency
      if (err instanceof HttpError && err.statusCode === 400 && /email already registered/i.test(err.message)) {
        throw new HttpError(409, err.message);
      } else {
        throw err;
      }
    }
  }

  public async checkEmailAvailability(email: string): Promise<EmailAvailability> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/userregistration/email`,
      body: {
        email
      }
    };
    const response = await this.sendRequest(request);
    const result = EmailAvailabilityCodec.decode(response);

    if (result.isLeft() || !EmailAvailabilityCodec.is(result.value)) {
      throw new Error('Invalid response.');
    }

    return result.value;
  }

  public async resendVerificationEmail(email: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/userregistration/resend`,
      body: {
        email
      }
    };

    await this.sendRequest(request);
  }

  public async verifyEmailAndCreateUser(emailVerification: EmailVerification): Promise<OAuth2Response> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/userregistration/verify/oauth2`,
      body: {
        client_id: emailVerification.clientId,
        client_secret: emailVerification.clientSecret,
        token: emailVerification.token
      }
    };
    const response = await this.sendRequest(request);
    const result = OAuth2ResponseCodec.decode(response);

    if (result.isLeft()) {
      throw new Error('Invalid response.');
    }

    return result.value;
  }
}

export { ApiV1UserRegistrationService };