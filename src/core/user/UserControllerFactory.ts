import { Option, filter, fold, some, fromNullable } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpDelete,
  httpGet,
  httpPost,
  interfaces,
  queryParam,
  requestBody,
  requestParam,
  request,
  requestHeaders,
} from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { UpdateAlarmSettings, UpdateAlarmSettingsCodec, User, UserUpdate, UserUpdateValidator, RetrieveAlarmSettingsFilterCodec, RetrieveAlarmSettingsFilter, EntityAlarmSettings, UserStats, AdminUserCreate, AdminUserCreateCodec, ImpersonateUserCodec, ImpersonateUser, ImpersonationToken, UserEmailChangeResponse, EntityAlarmSettingsItemCodec, UserEmailTypeCodec, EmailChangeVerifyRequest, EmailChangeVerifyRequestCodec, UserEmailChangeVerifyResponse } from '../api';
import {
  asyncMethod,
  authorizationHeader,
  createMethod,
  deleteMethod,
  emptyMethod,
  httpController,
  parseExpand,
  withResponseType,
} from '../api/controllerUtils';
import Request from '../api/Request';
import * as Responses from '../api/response';
import { AlexaService, UserService } from '../service';
import { PasswordResetService } from './PasswordResetService';
import { EmailAvailability, EmailVerification, EmailVerificationCodec, OAuth2Response, UserRegistrationData, UserRegistrationDataCodec, UserRegistrationService, RegistrationTokenResponse } from './UserRegistrationService';
import UnauthorizedError from '../api/error/UnauthorizedError';
import { Password } from '../api/validator/Password';
import ConcurrencyService from '../../concurrency/ConcurrencyService';
import LimitReachedError from '../api/error/LimitReachedError';
import ForbiddenError from '../api/error/ForbiddenError';
import * as _ from 'lodash';
import { UserEmailChangeService } from './UserEmailChangeService';
import { Email } from '../api/validator/Email';

export function UserControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ user_id: id }));
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/users')
  class UserController extends BaseHttpController {
    constructor(
      @inject('UserService') private userService: UserService,
      @inject('UserRegistrationService') private userRegistrationService: UserRegistrationService,
      @inject('PasswordResetService') private passwordResetService: PasswordResetService,
      @inject('ConcurrencyService') private concurrencyService: ConcurrencyService,
      @inject('UserEmailChangeService') private userEmailChangeService: UserEmailChangeService,
      @inject('AlexaService') private alexaService: AlexaService,
    ) {
      super();
    }

    @httpPost(
      '/impersonate',
      // Auth deferred to API v1
      reqValidator.create(t.type({
        body: ImpersonateUserCodec
      }))
    )
    private async impersonateUser(@requestBody() body: ImpersonateUser): Promise<ImpersonationToken> {
      const impersonatedUser = await this.userService.getUserByEmail(body.email, { 
        $select: {
          id: true
        }
      });
      
      if (!impersonatedUser) {
        throw new UnauthorizedError()
      }

      const impersonationToken = await this.userRegistrationService.impersonateUser(impersonatedUser.id, body.impersonatorEmail, body.impersonatorPassword);

      return {
        ...impersonationToken,
        userId: impersonatedUser.id
      }
    }

    @httpPost(
      '/password/request-reset',
      reqValidator.create(t.type({
        body: t.intersection([
          t.type({
            email: t.string
          }),
          t.partial({
            locale: t.string,
            app: t.string
          })
        ])
      }))
    )
    @asyncMethod
    private async requestPasswordReset(@requestBody() { email, locale, app }: { email: string, locale?: string, app?: string }): Promise<void> {
      if (!(await this.concurrencyService.acquireLock(`password-reset.${email}`, 60))) {
        throw new LimitReachedError('Password reset limit reached.');
      }

      return this.passwordResetService.requestReset(email, locale, app);
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
          newPassword: Password
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
      '/',
      auth,
      reqValidator.create(t.type({
        query: t.intersection([
          t.type({
            email: t.string
          }),
          t.partial({
            expand: t.string
          })
       ])
      }))
    )
    @withResponseType<User, Responses.UserResponse>(Responses.User.fromModel)
    private async getByEmail(@queryParam('email') email: string, @queryParam('expand') expand?: string): Promise<Option<User>> {
      const expandProps = parseExpand(expand);

      return fromNullable(await this.userService.getUserByEmail(email, expandProps));
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

    @httpGet(
      '/register/token',
      // Auth deferred to API v1
      reqValidator.create(t.type({
        query: t.type({
          email: t.string
        })
      }))
    )
    private async getRegistrationTokenByEmail(@request() req: Request, @queryParam('email') email: string): Promise<RegistrationTokenResponse> {
      const token = req.get('Authorization');

      if (!token) {
        throw new UnauthorizedError();
      }

      return this.userRegistrationService.getRegistrationTokenByEmail(token, email);
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
      '/admin',
      auth,
      reqValidator.create(t.type({
        body: AdminUserCreateCodec
      }))
    )
    @createMethod
    private async createAdminUser(@request() req: Request, @requestBody() adminUserCreate: AdminUserCreate): Promise<void> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!userId) {
        throw new ForbiddenError();
      }

      const isSuperUser = await this.userService.isSuperUser(userId);
      if (!isSuperUser) {
        throw new ForbiddenError('You must be a super user to create admin users.');
      }
      await this.userService.createAdminUser(adminUserCreate);
    }

    @httpDelete(
      '/admin/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    @deleteMethod
    private async removeAdminUser(@request() req: Request, @requestParam('id') id: string): Promise<void> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!userId) {
        throw new ForbiddenError();
      }

      const isSuperUser = await this.userService.isSuperUser(userId);
      if (!isSuperUser) {
        throw new ForbiddenError('You must be a super user to remove admin users.');
      }
      return this.userService.removeAdminUser(id);
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

    @httpGet('/me',
      auth,
      reqValidator.create(t.type({
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<User, Responses.UserResponse>(Responses.User.fromModel)
    private async getSelf(@request() req: Request, @queryParam('expand') expand?: string): Promise<Option<User>> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;
      const expandProps = parseExpand(expand);

      if (!userId) {
        throw new UnauthorizedError();
      }

      return this.userService.getUserById(userId, expandProps);
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

      return this.userService.getUserById(id, expandProps);
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

    @httpPost(
      '/:id/alarmSettings',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: UpdateAlarmSettingsCodec
      }))
    )
    private async updateAlarmSettings(@requestParam('id') id: string, @requestBody() data: UpdateAlarmSettings): Promise<void> {
      return this.userService.updateAlarmSettings(id, data);
    }

    @httpPost(
      '/:id/alarmSettings/_get',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: RetrieveAlarmSettingsFilterCodec
      }))
    )
    private async retrieveAlarmSettings(@requestParam('id') id: string, @requestBody() filters: RetrieveAlarmSettingsFilter): Promise<EntityAlarmSettings> {
      return this.userService.retrieveAlarmSettings(id, filters);
    }

    @httpPost(
      '/:id/enabledFeatures',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          items: t.array(t.string)
        })
      }))
    )
    private async addEnabledFeatures(@requestParam('id') id: string, @requestBody() { items }: { items: string[] }): Promise<void> {
      return this.userService.addEnabledFeatures(id, items);
    }

    @httpDelete(
      '/:id/enabledFeatures',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          items: t.array(t.string)
        })
      }))
    )
    private async removeEnabledFeatures(@requestParam('id') id: string, @requestBody() { items }: { items: string[] }): Promise<void> {
      return this.userService.removeEnabledFeatures(id, items);
    }

    @httpGet(
      '/:id/stats',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async retrieveUserStats(@requestParam('id') id: string): Promise<UserStats> {
      return this.userService.retrieveUserStats(id);
    }

    @httpPost(
      '/:id/email/request-change',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          email: Email,
        })
      }))
    )
    private async requestEmailChange(@requestParam('id') id: string, @requestBody() { email }: { email: string }): Promise<UserEmailChangeResponse> {
      return this.userEmailChangeService.requestEmailChange(email, id);
    }

    @httpPost(
      '/:id/email/verify-change',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: EmailChangeVerifyRequestCodec
      }))
    )
    private async verifyEmailChange(@requestParam('id') userId: string, @requestBody() body: EmailChangeVerifyRequest): Promise<UserEmailChangeVerifyResponse> {
      return this.userEmailChangeService.verifyEmailChange(userId, body.type, body.confirmationId, body.confirmationKey);
    }

    @httpGet(
      '/:id/alexa',
      authWithId,
    )
    private async fetchAlexaLink(
      @requestParam('id') userId: string,
      @requestHeaders('Authorization') authToken: string,
      @queryParam('deep') deep: string,
    ): Promise<any> {

      return this.alexaService.getAccountLink(authToken, userId, /^true$/gi.test(deep));
    }

    @httpPost(
      '/:id/alexa',
      authWithId,
    )
    @createMethod
    private async createAlexaLink(
        @requestParam('id') userId: string,
        @requestHeaders('Authorization') authToken: string,
        @requestBody() body: any,
      ): Promise<any> {

      return this.alexaService.postAccountLink(authToken, userId, body);
    }

    @httpDelete(
      '/:id/alexa',
      authWithId,
    )
    @emptyMethod
    private async removeAlexaLink(
      @requestParam('id') userId: string,
      @requestHeaders('Authorization') authToken: string,
      @queryParam('force') force: string,
    ): Promise<void> {

      return this.alexaService.deleteAccountLink(authToken, userId, /^true$/gi.test(force));
    }
  }

  return UserController;
}