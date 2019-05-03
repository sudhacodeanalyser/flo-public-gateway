import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import * as t from 'io-ts';
import { Subscription, SubscriptionCreateValidator, SubscriptionCreate } from '../api/api';
import SubscriptionService from './SubscriptionService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { httpController, parseExpand, createMethod, deleteMethod } from '../api/controllerUtils';

export function SubscriptionControllerFactory(container: Container): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: 1 }, '/subscriptions')
  class SubscriptionController extends BaseHttpController {
    constructor(
      @inject('SubscriptionService') private subscriptionService: SubscriptionService
    ) {
      super();
    }

    @httpPost(
      '/',
      reqValidator.create(t.type({
        body: SubscriptionCreateValidator
      }))
    )
    @createMethod
    private async createSubscription(@requestBody() subscription: SubscriptionCreate): Promise<Subscription | {}> {
      return this.subscriptionService.createSubscription(subscription);
    }

    @httpGet('/:id',
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