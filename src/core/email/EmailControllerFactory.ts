import { Container, inject } from "inversify";
import { BaseHttpController, interfaces, httpPost, requestParam, httpGet } from 'inversify-express-utils';
import * as O from 'fp-ts/lib/Option';
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { httpController, asyncMethod } from "../api/controllerUtils";
import { EmailGatewayService, EmailTypes } from '../../email/EmailGatewayService';
import ReqValidationMiddlewareFactory from "../..//validation/ReqValidationMiddlewareFactory";
import { UserService } from "../user/UserService";
import ResourceDoesNotExistError from "../api/error/ResourceDoesNotExistError";
import UnauthorizedError from "../api/error/UnauthorizedError";
import { UnsubscribePreferences } from "../api/model/Email";
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';

export function EmailControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithUserId = authMiddlewareFactory.create(async ({ params: { userId } }: Request) => ({ user_id: userId }));

  @httpController({ version: apiVersion }, '/emails')
  class EmailController extends BaseHttpController {
    constructor(
      @inject('EmailGatewayService') private emailGatewayService: EmailGatewayService,
      @inject('UserService') private readonly userService: UserService,
    ) {
      super();
    }

    @httpGet(
      '/unsubscribe/:userId',
      authWithUserId,
      reqValidator.create(t.type({
        params: t.type({
          userId: t.string
        })
      }))
    )
    @asyncMethod
    private async getUnsubscribePreferences(@requestParam('userId') userId: string): Promise<UnsubscribePreferences> {
      const maybeUserData = await this.userService.getUserById(userId, {
        $select: {
          email: true
        }
      });

      return pipe(
        maybeUserData,
        O.fold(
          () => {
            throw new ResourceDoesNotExistError('User does not exist.');
          },
          userData => this.emailGatewayService.getUnsubscribePreferences(userData.email as string)
        )
      );
    }

    @httpPost(
      '/unsubscribe/weekly/:userId/:locationId',
      reqValidator.create(t.type({
        params: t.type({
          userId: t.string,
          locationId: t.string,
        })
      }))
    )
    @asyncMethod
    private async unsubscribeUserFromWeeklyEmail(@requestParam('userId') userId: string, @requestParam('locationId') locationId: string): Promise<UnsubscribePreferences> {
      const userData = await this.userService.getUserById(userId, {
        $select: {
          id: true,
          email: true,
          locations: {
            $select: {
              id: true
            }
          }
        }
      });

      if (O.isNone(userData) || !userData.value.email) {
        throw new ResourceDoesNotExistError('User does not exist.');
      }

      const userLocations = userData.value.locations.map(l => l.id);
      if (!userLocations.includes(locationId)) {
        throw new UnauthorizedError();
      }

      return this.emailGatewayService.addUnsubscribePreferences(userData.value.email, [EmailTypes.WEEKLY_EMAIL]);
    }

    @httpPost(
      '/subscribe/weekly/:userId/:locationId',
      reqValidator.create(t.type({
        params: t.type({
          userId: t.string,
          locationId: t.string,
        })
      }))
    )
    @asyncMethod
    private async subscribeUserToWeeklyEmail(@requestParam('userId') userId: string, @requestParam('locationId') locationId: string): Promise<void> {
      const userData = await this.userService.getUserById(userId, {
        $select: {
          id: true,
          email: true,
          locations: {
            $select: {
              id: true
            }
          }
        }
      });

      if (O.isNone(userData) || !userData.value.email) {
        throw new ResourceDoesNotExistError('User does not exist.');
      }

      const userLocations = userData.value.locations.map(l => l.id);
      if (!userLocations.includes(locationId)) {
        throw new UnauthorizedError();
      }

      await this.emailGatewayService.removeUnsubscribePreferences(userData.value.email, [EmailTypes.WEEKLY_EMAIL]);
    }
  }

  return EmailController;
}
