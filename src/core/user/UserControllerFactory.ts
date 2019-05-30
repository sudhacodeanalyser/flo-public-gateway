import * as t from 'io-ts';
import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import UserService from './UserService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { User, UserUpdateValidator, UserUpdate } from '../api';
import { httpController, parseExpand, deleteMethod } from '../api/controllerUtils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import { UserRegistrationService, UserRegistrationDataCodec, UserRegistrationData, EmailAvailability } from './UserRegistrationService';

export function UserControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ user_id: id }));

  @httpController({ version: apiVersion }, '/users')
  class UserController extends BaseHttpController {
    constructor(
      @inject('UserService') private userService: UserService,
      @inject('UserRegistrationService') private userRegistrationService: UserRegistrationService
    ) {
      super();
    }

    @httpPost(
      '/register',
      reqValidator.create(t.type({
        body: UserRegistrationDataCodec
      }))
    )
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
    private async resendVerificationEmail(@requestBody() { email }: { email: string }): Promise<void> {
      return this.userRegistrationService.resendVerificationEmail(email);
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
    private async updatePartialUser(@requestParam('id') id: string, @requestBody() userUpdate: UserUpdate): Promise<User> {
      return this.userService.updatePartialUser(id, userUpdate);
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
    private async getUser(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<User | {}> {
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
  }

  return UserController;
}