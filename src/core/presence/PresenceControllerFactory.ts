import {interfaces, controller, httpGet, httpPost, requestBody, httpDelete, request } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import PresenceService from './PresenceService';
import { httpController } from '../api/controllerUtils';
import AuthMiddlewareFactory from "../../auth/AuthMiddlewareFactory";
import Request from "../api/Request";
import { PresenceData, PresenceRequestValidator } from "../api/model/Presence";
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import _ from 'lodash';


export function PresenceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithUserId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ icd_id: id }));

  @httpController({ version: apiVersion }, '/presence')
  class PresenceController implements interfaces.Controller {
    constructor(
      @inject('PresenceService') private presenceService: PresenceService
    ) {}

    @httpPost('/', 
      authWithUserId,
      reqValidator.create(t.type({
        body: PresenceRequestValidator
      }))
    )
    private async report(@request() req: Request, @requestBody() presencePostRequest: PresenceData): Promise<{ [key: string]: any }> {
      const tokenMetadata = req.token;

      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }

      // TODO: Fill in with real data based on auth token
      const xForwardedForHeader = req.headers && req.headers['x-forwarded-for'];
      const xForwardedFor = xForwardedForHeader === undefined ? '' : (_.isArray(xForwardedForHeader) ? xForwardedForHeader[0] : xForwardedForHeader).split(',')[0];
      const ipAddress = xForwardedFor || (req.connection && req.connection.remoteAddress) || '';
      const userId = tokenMetadata.user_id;
      const clientId = tokenMetadata.client_id || 'legacy';

      return this.presenceService.report(presencePostRequest, ipAddress, userId, clientId);
    }
  }

  return PresenceController;
}