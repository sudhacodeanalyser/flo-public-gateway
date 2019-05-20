import {interfaces, controller, httpGet, httpPost, requestBody, httpDelete} from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import PresenceService from './PresenceService';
import { httpController } from '../api/controllerUtils';
import AuthMiddlewareFactory from "../../auth/AuthMiddlewareFactory";
import Request from "../api/Request";
import {PresenceData} from "../api/model/Presence";

export function PresenceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithUserId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ icd_id: id }));

  @httpController({ version: apiVersion }, '/presence')
  class PresenceController implements interfaces.Controller {
    constructor(
      @inject('PresenceService') private presenceService: PresenceService
    ) {}

    @httpPost('/', authWithUserId)
    private async report(@requestBody() presencePostRequest: PresenceData): Promise<{ [key: string]: any }> {

      // TODO: Fill in with real data based on auth token
      const ipAddress = "127.0.0.1";
      const userId = "01234567";
      const appName = "mySuperAwesomeApp";

      return this.presenceService.report(presencePostRequest, ipAddress, userId, appName);
    }
  }

  return PresenceController;
}