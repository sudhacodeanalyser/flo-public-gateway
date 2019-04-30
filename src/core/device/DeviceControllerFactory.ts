import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { Device, DeviceUpdate, DeviceUpdateValidator } from '../api/api';
import DeviceService from './DeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { httpController, parseExpand, deleteMethod } from '../api/controllerUtils';

export function DeviceControllerFactory(container: Container): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: 1 }, '/devices')
  class DeviceController implements interfaces.Controller {
    constructor(
      @inject('DeviceService') private deviceService: DeviceService
    ) {}

    @httpGet('/:id',
      // TODO refine validations
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Device | {}> {
      const expandProps = parseExpand(expand);

      return this.deviceService.getDeviceById(id, expandProps);
    }

    @httpPost('/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        // TODO Do not allow empty
        body: DeviceUpdateValidator
      }))
    )
    private async updatePartialDevice(@requestParam('id') id: string, @requestBody() deviceUpdate: DeviceUpdate): Promise<Device> {

      return this.deviceService.updatePartialDevice(id, deviceUpdate);
    }

    @httpDelete('/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    @deleteMethod
    private async removeDevice(@requestParam('id') id: string): Promise<void> {

      return this.deviceService.removeDevice(id);
    }
  }

  return DeviceController;
}