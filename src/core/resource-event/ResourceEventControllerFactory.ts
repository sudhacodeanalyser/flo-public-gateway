import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpGet,
  interfaces,
  queryParam,
} from 'inversify-express-utils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { httpController } from '../api/controllerUtils';
import * as t from 'io-ts';
import { ResourceEventService } from './ResourceEventService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { ResourceEvent } from '../api/model/ResourceEvent';

export function ResourceEventControllerFactory(
  container: Container,
  apiVersion: number
): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>(
    'ReqValidationMiddlewareFactory'
  );
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/audit/events')
  class ResourceEventController extends BaseHttpController {
    constructor(
      @inject('ResourceEventService')
      private resourceEventService: ResourceEventService
    ) {
      super();
    }

    @httpGet(
      '/',
      auth,
      reqValidator.create(
        t.type({
          query: t.type({
            accountId: t.string,
            from: t.string,
            to: t.string,
          }),
        })
      )
    )
    private async getEvents(
      @queryParam('accountId') accountId: string,
      @queryParam('from') from: string,
      @queryParam('to') to: string
    ): Promise<ResourceEvent[]> {
      return this.resourceEventService.getResourceEvents(accountId, from, to);
    }
  }

  return ResourceEventController;
}
