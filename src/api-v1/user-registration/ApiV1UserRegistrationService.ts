import { inject, injectable } from 'inversify';
import { HttpService } from '../../http/HttpService';
import HttpError from '../../http/HttpError';
import { EmailAvailabilityCodec } from './models';
import { UserRegistrationData, EmailAvailability, UserRegistrationService, EmailVerification, OAuth2Response, OAuth2ResponseCodec, RegistrationTokenResponse, RegistrationTokenResponseCodec, ImpersonationToken } from '../../core/user/UserRegistrationService';
import { isLeft } from 'fp-ts/lib/Either';

import * as _ from 'lodash';
import { CachePolicy } from '../../cache/CacheMiddleware';
import jwt from 'jsonwebtoken';
import { pipe } from 'fp-ts/lib/pipeable';
import { RegistrationTokenCodec } from '../../auth/Token';
// tslint:disable-next-line:no-duplicate-imports
import * as Either from 'fp-ts/lib/Either';
import Redis from 'ioredis';

@injectable()
class ApiV1UserRegistrationService extends HttpService implements UserRegistrationService {
  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('RedisClient') protected redisClient: Redis,
    @inject('CachePolicy') protected cachePolicy: CachePolicy,
  ) {
    super();
  }

  public async acceptTermsAndVerifyEmail(data: UserRegistrationData): Promise<void> {
    try {
      const request = {
        method: 'POST',
        url: `${this.apiV1Url}/userregistration`,
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
          phone_mobile: data.phone,
          locale: data.locale,
          skipEmailSend: data.skipEmailSend,
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
      url: `${this.apiV1Url}/userregistration/email`,
      body: {
        email
      }
    };
    const response = await this.sendRequest(request);
    const result = EmailAvailabilityCodec.decode(response);

    if (isLeft(result) || !EmailAvailabilityCodec.is(result.right)) {
      throw new Error('Invalid response.');
    }

    return result.right;
  }

  public async resendVerificationEmail(email: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${this.apiV1Url}/userregistration/resend`,
      body: {
        email
      }
    };

    await this.sendRequest(request);
  }

  public async verifyEmailAndCreateUser(emailVerification: EmailVerification): Promise<OAuth2Response> {
    const key = this.formatKey(emailVerification)

    const cacheResult = this.cachePolicy === CachePolicy.WRITE_ONLY || this.cachePolicy === CachePolicy.OFF ?
      null :
      (key) && await this.redisClient.get(key);

    if (cacheResult != null || this.cachePolicy === CachePolicy.READ_ONLY) {
      return cacheResult && JSON.parse(cacheResult);
    }

    const request = {
      method: 'POST',
      url: `${this.apiV1Url}/userregistration/verify/oauth2`,
      body: {
        client_id: emailVerification.clientId,
        client_secret: emailVerification.clientSecret,
        token: emailVerification.token
      }
    };
    const response = await this.sendRequest(request);
    const result = OAuth2ResponseCodec.decode(response);

    if (isLeft(result)) {
      throw new Error('Invalid response.');
    }

    if (key && result.right && (this.cachePolicy === CachePolicy.WRITE_ONLY || this.cachePolicy === CachePolicy.READ_WRITE)) {
      // Don't wait on cache write
      this.redisClient.setex(key, 60 * 5, JSON.stringify(result.right));
    }
    return result.right
  }

  public async getRegistrationTokenByEmail(authToken: string, email: string): Promise<RegistrationTokenResponse> {
    const request = {
      method: 'GET',
      url: `${this.apiV1Url}/userregistration?email=${encodeURIComponent(email)}`,
      authToken
    };
    const response = await this.sendRequest(request);
    const result = RegistrationTokenResponseCodec.decode(response);

    if (isLeft(result)) {
      throw new Error('Invalid response.');
    }

    return result.right;
  }

  public async impersonateUser(userId: string, impersonatorEmail: string, impersonatorPassword: string): Promise<ImpersonationToken> {
    const request = {
      method: 'POST',
      url: `${this.apiV1Url}/auth/user/${userId}/impersonate`,
      body: {
        username: impersonatorEmail,
        password: impersonatorPassword
      }
    };

    return this.sendRequest(request);
  }

  private formatTokenKey(token: string): string | null {
    const tokenData = jwt.decode(token || '');
    const key = pipe(
      RegistrationTokenCodec.decode(tokenData),
      Either.fold(
        (): string | null => null,
        ({ jti, iat }) => `${jti}_${iat}`
      ),
    );
    return key && `{${ key }}`;
  }

  private formatKey(emailVerification: EmailVerification): string | null {
    const tokenKey = this.formatTokenKey(emailVerification.token);
    return tokenKey && `UserRegistration_${tokenKey}`;
  }
}

export { ApiV1UserRegistrationService };