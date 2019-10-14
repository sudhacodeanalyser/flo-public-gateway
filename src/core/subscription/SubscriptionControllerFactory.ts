import { none, Option, some } from 'fp-ts/lib/Option';
import { Container, inject, multiInject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Subscription, SubscriptionCreate, SubscriptionCreateValidator, SubscriptionProviderWebhookHandler, CreditCardInfo, ProvidersCodec, ProviderPaymentData } from '../api';
import { createMethod, deleteMethod, httpController, parseExpand, withResponseType } from '../api/controllerUtils';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import * as Responses from '../api/response';
import { SubscriptionService } from '../service';
import Request from '../api/Request';
export function SubscriptionControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  // TODO: Figure out what resource role (e.g. location owner, account owner) is necessary
  // to authorize subscription requests. This currently will only require a valid token, regardless
  // of which location or account for which you are creating the subscription.
  const auth = authMiddlewareFactory.create(undefined, 'ALL/api/v2/subscriptions');

  @httpController({ version: apiVersion }, '/subscriptions')
  class SubscriptionController extends BaseHttpController {
    constructor(
      @inject('SubscriptionService') private subscriptionService: SubscriptionService,
      @multiInject('SubscriptionProviderWebhookHandler') private webhookHandlers: SubscriptionProviderWebhookHandler[]
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
    @withResponseType<Subscription, Responses.SubscriptionResponse>(Responses.Subscription.fromModel)
    private async createSubscription(@requestBody() subscription: SubscriptionCreate): Promise<Option<Subscription>> {
      const createdSubscription = await this.subscriptionService.createSubscription(subscription);

      return some(createdSubscription);
    }

    @httpGet(
      '/payment',
      auth,
      reqValidator.create(t.type({
        query: t.type({
          userId: t.string,
          provider: t.union([t.string, t.undefined])
        })
      }))
    )
    private async getPaymentSources(@queryParam('userId') userId: string, @queryParam('provider') providerName?: string): Promise<{ items: CreditCardInfo[] }> {
      const sources = await this.subscriptionService.getPaymentSourcesByUserId(userId, providerName || 'stripe');

      return {
        items: sources
      };
    }

    @httpPost(
      '/payment',
      auth,
      reqValidator.create(t.type({
       body: t.type({
         userId: t.string,
         provider: ProvidersCodec
       })
      }))
    )
    private async updatePaymentSources(@requestBody() { userId, provider: { name, token } }: { userId: string, provider: ProviderPaymentData }): Promise<{ items: CreditCardInfo[] }> {
      const updatedSources = await this.subscriptionService.updatePaymentSourceByUserId(userId, name, token);

      return {
        items: updatedSources
      };
    }


    @httpGet('/:id',
      // auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<Subscription, Responses.SubscriptionResponse>(Responses.Subscription.fromModel)
    private async getSubscription(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<Subscription>> {
      const expandProps = parseExpand(expand);
      const subscription = await this.subscriptionService.getSubscriptionById(id, expandProps);

      if (_.isEmpty(subscription)) {
        return none;
      }

      return some(subscription as Subscription);
    }

    @httpDelete(
      '/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.partial({
          cancellationReason: t.string,
          cancelImmediately: t.boolean
        })
      }))
    )
    @deleteMethod
    private async removeSubscription(@requestParam('id') id: string, @requestBody() { cancellationReason, cancelImmediately }: { cancellationReason?: string, cancelImmediately?: boolean } ): Promise<Subscription> {

      return this.subscriptionService.cancelSubscription(id, cancelImmediately, cancellationReason);
    }

    @httpPost(
      '/webhooks/stripe',
      'StripeWebhookAuthMiddleware'
    )
    private async handleStripeWebhook(@requestBody() event: { [key: string]: any }): Promise<void> {
      return this.getWebhookHandler('stripe').handle(event);
    }

    private toResponse(subscription: Subscription): Responses.SubscriptionResponse {
      return Responses.Subscription.fromModel(subscription as Subscription);
    }

    private getWebhookHandler(providerName: string): SubscriptionProviderWebhookHandler {
      const webhookHandler = _.find(this.webhookHandlers, ['name', providerName]);
      if (!webhookHandler) {
        throw new ResourceDoesNotExistError('Provider does not exist.');
      }
      return webhookHandler;
    }
  }

  return SubscriptionController;
}