import {interfaces, controller, httpGet, httpPost, requestBody, httpDelete, request, queryParam } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import PresenceService from './PresenceService';
import { httpController } from '../api/controllerUtils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import { PresenceData, PresenceRequest, PresenceRequestValidator } from '../api/model/Presence';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import _ from 'lodash';
import ForbiddenError from '../api/error/ForbiddenError';

export function PresenceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/presence')
  class PresenceController implements interfaces.Controller {
    constructor(
      @inject('PresenceService') private presenceService: PresenceService
    ) {}

    @httpPost('/me', 
      auth,
      reqValidator.create(t.type({
        body: PresenceRequestValidator
      }))
    )
    private async reportSelf(@request() req: Request, @requestBody() presencePostRequest: PresenceRequest): Promise<{ [key: string]: any }> {
      const tokenMetadata = req.token;

      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }

      if (
        (!_.isEmpty(presencePostRequest.locationIds) || !_.isEmpty(presencePostRequest.deviceIds)) &&
        !await this.presenceService.validateLocations(
          _.uniq([
            ...presencePostRequest.locationIds || [],
            ...(await this.presenceService.getLocationsFromDevices(presencePostRequest.deviceIds || []))
          ]),
          tokenMetadata.user_id
        )
      ) {
        throw new ForbiddenError();
      }
      // TODO: Fill in with real data based on auth token
      const ipAddress = this.extractIpAddress(req);
      const userId = tokenMetadata.user_id;
      const clientId = tokenMetadata.client_id || 'legacy';
      const presenceData = await this.presenceService.formatPresenceData(presencePostRequest, ipAddress, userId, clientId);

      return this.presenceService.report(presenceData);
    }
    @httpPost('/',
      auth,
      reqValidator.create(t.type({
        body: t.intersection([
          PresenceRequestValidator,
          t.type({
            userId: t.string
          })
        ])
      }))
    )
    private async report(@request() req: Request, @requestBody() presencePostRequest: PresenceRequest & { userId: string}): Promise<{ [key: string]: any }> {
      const tokenMetadata = req.token;

      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }

      const ipAddress = this.extractIpAddress(req);
      const clientId = tokenMetadata.client_id || 'legacy';
      const presenceData = await this.presenceService.formatPresenceData(presencePostRequest, ipAddress, presencePostRequest.userId, clientId);

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