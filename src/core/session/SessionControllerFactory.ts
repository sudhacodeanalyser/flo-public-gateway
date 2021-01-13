import { interfaces, controller, httpPost, request, requestBody } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { SessionService } from '../service';
import { httpController } from '../api/controllerUtils';
import moment from 'moment';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import { FirestoreTokenResponse } from './FirestoreAuthService';
import ForbiddenError from '../api/error/ForbiddenError';

export function SessionControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  const FirestoreAuthRequestBodyCodec = t.partial({
    macAddresses: t.array(t.string),
    locationIds: t.array(t.string),
    userIds: t.array(t.string),
  });

  type FirestoreAuthRequestBody = t.TypeOf<typeof FirestoreAuthRequestBodyCodec>;

  @httpController({ version: apiVersion }, '/session')
  class SessionController implements interfaces.Controller {
    constructor(
      @inject('SessionService') private sessionService: SessionService
    ) {}

    @httpPost('/firestore',
      auth,
      reqValidator.create(t.type({
        body: FirestoreAuthRequestBodyCodec
      }))
    )
    private async issueFirestoreToken(@request() req: Request, @requestBody() body: FirestoreAuthRequestBody): Promise<FirestoreTokenResponse> {
      const token = req.token;

      if (!token || !token.user_id) {
        throw new ForbiddenError();
      }
      return this.sessionService.issueFirestoreToken(token.user_id, {
        ...(body.macAddresses ? { devices: body.macAddresses } : {}),
        ...(body.locationIds ? { locations: body.locationIds } : {}),
        ...(body.userIds ? { users: body.userIds } : {}),
      });
    }

    @httpPost('/logout',
      auth
    )
    private async logout(@request() req: Request): Promise<void> {
      const token = req.get('Authorization');

      if (token) {
        await this.sessionService.logout(token);
      }

    }
  }
  return SessionController;
}