import {interfaces, controller, httpGet, httpPost, requestBody, httpDelete, request, queryParam } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import PresenceService from './PresenceService';
import { httpController } from '../api/controllerUtils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import {
  PresenceDataValidatorCodec,
  PresenceRequest, PresenceRequestCodec,
} from '../api/model/Presence';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import * as _ from 'lodash';
import { DependencyFactoryFactory } from '../api';
import { LocationService } from '../location/LocationService';
import ReqValidationError from '../../validation/ReqValidationError';

export function PresenceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithParents = authMiddlewareFactory.create(async ({ body: { locationIds, deviceIds }}: Request, depFactoryFactory: DependencyFactoryFactory) => {
    const locationService = depFactoryFactory<LocationService>('LocationService')();
    const allLocationIds = (!_.isEmpty(locationIds) || !_.isEmpty(deviceIds)) ? _.uniq([
      ...locationIds || [],
      ...(deviceIds?.length ?
        (await locationService.getLocationsFromDevices(deviceIds || [])) :
        [])
    ]): [];

    return Promise.all(allLocationIds.map(async (locId: string) => {
      const parentIds = await locationService.getAllParentIds(locId);
      return {
        location_id: [locId, ...parentIds]
      }
    }));
  });

  @httpController({ version: apiVersion }, '/presence')
  class PresenceController implements interfaces.Controller {
    constructor(
      @inject('PresenceService') private presenceService: PresenceService
    ) {}

    @httpPost('/me', 
      auth,
      reqValidator.create(t.type({
        body: t.exact(t.partial(PresenceRequestCodec.props))
      }))
    )
    private async reportSelf(@request() req: Request, @requestBody() presencePostRequest: PresenceRequest): Promise<{ [key: string]: any }> {
      const tokenMetadata = req.token;

      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }

      // TODO: Fill in with real data based on auth token
      const ipAddress = this.extractIpAddress(req);
      const userId = tokenMetadata.user_id;
      const clientId = tokenMetadata.client_id || 'legacy';
      const presenceData = await this.presenceService.formatPresenceData(presencePostRequest, ipAddress, userId, clientId);

      return this.presenceService.report(presenceData);
    }
    @httpPost('/',
      reqValidator.create(t.type({
        body: PresenceDataValidatorCodec
      })),
      authWithParents
    )
    private async report(@request() req: Request, @requestBody() presencePostRequest: PresenceRequest & { userId?: string }): Promise<{ [key: string]: any }> {
      const tokenMetadata = req.token;

      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }

      const ipAddress = this.extractIpAddress(req);
      const clientId = tokenMetadata.client_id || 'legacy';

      const userId = (tokenMetadata.roles.includes('system.admin')) ? presencePostRequest.userId : tokenMetadata.user_id;
      if (!userId) {
        throw new ReqValidationError('User id not found')
      }
      const presenceData = await this.presenceService.formatPresenceData(presencePostRequest, ipAddress, userId, clientId);

      return this.presenceService.report(presenceData);
    }

    @httpGet('/now',
      auth
    )
    private async getNow(): Promise<any> {
      return this.presenceService.getNow();
    }

    @httpGet('/history',
      auth
    )
    private async getHistory(): Promise<any> {
      return this.presenceService.getHistory();
    }

    @httpGet('/',
      auth,
      reqValidator.create(t.type({
        query: t.type({
          userId: t.string
        })
      }))
    )
    private async getByUserId(@queryParam('userId') userId: string): Promise<any> {
      return this.presenceService.getByUserId(userId);
    }

    private extractIpAddress(req: Request): string {
      const xForwardedForHeader = req.headers && req.headers['x-forwarded-for'];
      const xForwardedFor = xForwardedForHeader === undefined ? '' : (_.isArray(xForwardedForHeader) ? xForwardedForHeader[0] : xForwardedForHeader).split(',')[0];

      return  xForwardedFor || (req.connection && req.connection.remoteAddress) || '';
    }

  }



  return PresenceController;
}