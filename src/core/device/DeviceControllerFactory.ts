import _ from 'lodash';
import * as express from 'express';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';
import { injectable, inject, Container } from 'inversify';
import DeviceService from './DeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';

export function DeviceControllerFactory(container: Container) {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @controller('/devices', 'LoggerMiddleware')
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
    private getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string) {
      const expandProps = (expand === undefined ? '' : expand).split(',').filter(prop => !_.isEmpty(prop));

      return this.deviceService.getDeviceById(id, expandProps);
    }
  }

  return DeviceController;
}