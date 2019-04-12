import * as express from 'express';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import DeviceService from './DeviceService';

@controller('/devices', 'LoggerMiddleware')
export class DeviceController implements interfaces.Controller {
  constructor(
    @inject('DeviceService') private deviceService: DeviceService
  ) {}

  @httpGet('/:id')
  private getDevice(@requestParam('id') id: string) {

    return this.deviceService.getDeviceById(id);
  }
}