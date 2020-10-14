import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpPut,
  interfaces,
  queryParam,
  request,
  requestParam,
} from 'inversify-express-utils';
import * as t from 'io-ts';
import { asyncMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';


export function EventControllerFactory(container: Container, apiVersion: number): interfaces.Controller {

  @httpController({ version: apiVersion }, '/events')
  class EventLogController extends BaseHttpController {
    constructor() {
      super();
    }

    @httpPut('/')
    @asyncMethod
    private async putEvents(@request() req: Request): Promise<void> {
      return;
    }
  }

  return EventLogController;
}
