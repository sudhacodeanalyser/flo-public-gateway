import { interfaces, httpGet, request, BaseHttpController, httpPost } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { httpController } from '../api/controllerUtils';
import Request from '../../core/api/Request';
import { AlarmDotcomService } from './AlarmDotcomService';

export function AlarmDotcomControllerFactory(container: Container, apiVersion: number): interfaces.Controller {

  // simple pass-through proxy to flo-alarm-dotcom service. SEE: https://flotechnologies.atlassian.net/wiki/spaces/FLO/pages/2278064129/Alarm.com
  @httpController({ version: apiVersion }, '/app/alarm-dotcom')
  class AlarmDotcomController extends BaseHttpController {
    constructor(
      @inject('AlarmDotcomService') private alarmDotcomService: AlarmDotcomService,
    ) {
      super();
    }

    @httpGet('')
    private async getPing(@request() req: Request): Promise<any> {
      return this.alarmDotcomService.getPing();
    }

    @httpPost('/fulfillment')
    private async postFulfillment(@request() req: Request): Promise<any> {
      return this.alarmDotcomService.postFulfillment(req.headers.authorization as string, req.body);
    }

    @httpGet('/jwk')
    private async getJWK(@request() req: Request): Promise<any> {
      return this.alarmDotcomService.getJWK();
    }
  }
  return AlarmDotcomControllerFactory;
}