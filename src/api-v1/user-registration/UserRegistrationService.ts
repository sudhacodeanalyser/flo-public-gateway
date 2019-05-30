import { inject, injectable } from 'inversify';
import { ApiV1Service } from '../ApiV1Service';
import ApiV1Error from '../ApiV1Error';
import { UserRegistrationDataCodec, UserRegistrationData, EmailAvailability, EmailAvailabilityCodec } from './models';
import _ from 'lodash';

@injectable()
class UserRegistrationService extends ApiV1Service {
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
      if (err instanceof ApiV1Error && err.statusCode === 400 && /email already registered/i.test(err.message)) {
        throw new ApiV1Error(409, err.message);
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
}

export { UserRegistrationDataCodec, UserRegistrationData, EmailAvailability, UserRegistrationService };