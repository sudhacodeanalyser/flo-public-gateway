import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { User, UserUpdate, UserUpdateValidator } from '../api';
import { asyncMethod, authorizationHeader, createMethod, deleteMethod, httpController, parseExpand, withResponseType } from '../api/controllerUtils';
import Request from '../api/Request';
import { UserService } from '../service';
import { PasswordResetService } from './PasswordResetService';
import { EmailAvailability, EmailVerification, EmailVerificationCodec, OAuth2Response, UserRegistrationData, UserRegistrationDataCodec, UserRegistrationService } from './UserRegistrationService';
import { Option, some, none } from 'fp-ts/lib/Option';
import * as Responses from '../api/response';
import _ from 'lodash';

export function UserControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ user_id: id }));

  @httpController({ version: apiVersion }, '/users')
  class UserController extends BaseHttpController {
    constructor(
      @inject('UserService') private userService: UserService,
      @inject('UserRegistrationService') private userRegistrationService: UserRegistrationService,
      @inject('PasswordResetService') private passwordResetService: PasswordResetService
    ) {
      super();
    }

    @httpPost(
      '/password/request-reset',
      reqValidator.create(t.type({
        body: t.type({
          email: t.string
        })
      }))
    )
    @asyncMethod
    private async requestPasswordReset(@requestBody() { email }: { email: string }): Promise<void> {
      return this.passwordResetService.requestReset(email);
    }

    @httpPost(
      // auth is deferred to  API V1 call
      '/:id/password',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          oldPassword: t.string,
          newPassword: t.string
        })
      }))
    )
    private async passwordReset(@authorizationHeader() authToken: string,
                                @requestParam('id') id: string,
                                @requestBody() { oldPassword, newPassword }: { oldPassword: string, newPassword: string }): Promise<void> {
      return this.passwordResetService.resetPassword(authToken, id, oldPassword, newPassword);
    }

    @httpPost(
      '/register',
      reqValidator.create(t.type({
        body: UserRegistrationDataCodec
      }))
    )
    @createMethod
    private async acceptTermsAndVerifyEmail(@requestBody() data: UserRegistrationData): Promise<void> {
      return this.userRegistrationService.acceptTermsAndVerifyEmail(data);
    }

    @httpGet(
      '/register',
      reqValidator.create(t.type({
        query: t.type({
          email: t.string
        })
      }))
    )
    private async checkEmailAvailability(@queryParam('email') email: string): Promise<EmailAvailability> {
      return this.userRegistrationService.checkEmailAvailability(email);
    }

    @httpPost(
      '/register/resend',
      reqValidator.create(t.type({
        body: t.type({
          email: t.string
        })
      }))
    )
    @asyncMethod
    private async resendVerificationEmail(@requestBody() { email }: { email: string }): Promise<void> {
      return this.userRegistrationService.resendVerificationEmail(email);
    }

    @httpPost(
      '/register/verify',
      reqValidator.create(t.type({
        body: EmailVerificationCodec
      }))
    )
    @createMethod
    private async verifyEmailAndCreateUser(@requestBody() emailVerification: EmailVerification): Promise<OAuth2Response> {
      return this.userRegistrationService.verifyEmailAndCreateUser(emailVerification);
    }

    @httpPost(
      '/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: UserUpdateValidator
      }))
    )
    @withResponseType<User, Responses.UserResponse>(Responses.User.fromModel)
    private async updatePartialUser(@requestParam('id') id: string, @requestBody() userUpdate: UserUpdate): Promise<Option<User>> {
      return some(await this.userService.updatePartialUser(id, userUpdate));
    }

    @httpGet('/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<User, Responses.UserResponse>(Responses.User.fromModel)
    private async getUser(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<User>> {
      const expandProps = parseExpand(expand);
      const user = await this.userService.getUserById(id, expandProps);

      if (_.isEmpty(user)) {
        return none;
      }

      return some(user as User);
    }

    @httpDelete(
      '/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    @deleteMethod
    private async removeUser(@requestParam('id') id: string): Promise<void> {
      return this.userService.removeUser(id);
    }
  }

  return UserController;
}