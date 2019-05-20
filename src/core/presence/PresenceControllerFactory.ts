import {interfaces, controller, httpGet, httpPost, requestBody, httpDelete} from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import PresenseService from './PresenseService';
import { httpController } from '../api/controllerUtils';
import AuthMiddlewareFactory from "../../auth/AuthMiddlewareFactory";
import Request from "../api/Request";
import {PresenseData} from "../api/model/Presense";

export function PresenseControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithUserId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ icd_id: id }));

  @httpController({ version: apiVersion }, '/presense')
  class PresenseController implements interfaces.Controller {
    constructor(
      @inject('PresenseService') private presenseService: PresenseService
    ) {}

    @httpPost('/', authWithUserId)
    private async report(@requestBody() presensePostRequest: PresenseData): Promise<{ [key: string]: any }> {

      // TODO: Fill in with real data based on auth token
      const ipAddress = "127.0.0.1";
      const userId = "01234567";
      const appName = "mySuperAwesomeApp";

      return this.presenseService.report(presensePostRequest, ipAddress, userId, appName);
    }
  }

  return PresenseController;
}