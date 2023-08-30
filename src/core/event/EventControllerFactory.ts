import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpPut,
  interfaces,
  queryParam,
  request,
  requestParam,
} from 'inversify-express-utils';
import { asyncMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { EventService } from './EventService';
import { RawEvent, toDeviceMake } from '../api';


export function EventControllerFactory(container: Container, apiVersion: number): interfaces.Controller {

  @httpController({ version: apiVersion }, '/events')
  class EventLogController extends BaseHttpController {
    constructor(
      @inject('EventService') private eventService: EventService,
    ) {
      super();
    }

    @httpPut('/')
    @asyncMethod
    private async putEvents(
      @request() req: Request,
      @queryParam('date') date?: string,
      @queryParam('make') make?: string,
    ): Promise<void> {
      return this.eventService.createEvent(req.query as RawEvent, toDeviceMake(make), date);
    }
  }

  return EventLogController;
}
