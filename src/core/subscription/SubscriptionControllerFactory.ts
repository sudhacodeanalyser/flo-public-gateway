import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import * as t from 'io-ts';
import { Subscription, SubscriptionCreateValidator, SubscriptionCreate } from '../api/api';
import SubscriptionService from './SubscriptionService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { httpController, parseExpand, createMethod, deleteMethod } from '../api/controllerUtils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';

export function SubscriptionControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  // TODO: Figure out what resource role (e.g. location owner, account owner) is necessary
  // to authorize subscription requests. This currently will only require a valid token, regardless
  // of which location or account for which you are creating the subscription.
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/subscriptions')
  class SubscriptionController extends BaseHttpController {
    constructor(
      @inject('SubscriptionService') private subscriptionService: SubscriptionService
    ) {
      super();
    }

    @httpPost(
      '/',
      auth,
      reqValidator.create(t.type({
        body: SubscriptionCreateValidator
      }))
    )
    @createMethod
    private async createSubscription(@requestBody() subscription: SubscriptionCreate): Promise<Subscription | {}> {
      return this.subscriptionService.createSubscription(subscription);
    }

    @httpGet('/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getSubscription(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Subscription | {}> {
      const expandProps = parseExpand(expand);

      return this.subscriptionService.getSubscriptionById(id, expandProps);
    }

    @httpDelete(
      '/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    @deleteMethod
    private async removeSubscription(@requestParam('id') id: string): Promise<void> {
      return this.subscriptionService.removeSubscription(id);
    }
  }

  return SubscriptionController;
}