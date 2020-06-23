import { Container, inject } from 'inversify';
import {
  BaseHttpController,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody, requestParam
} from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { httpController, asyncMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import { HeadsUpService } from './HeadsUpService';
import { DeviceUpdate } from './model';

export function HeadsUpControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/headsup')
  class HeadsUpController extends BaseHttpController {

    constructor(
      @inject('HeadsUpService') private headsUpService: HeadsUpService
    ) {
      super();
    }

    @httpPost('/devices',
      auth,
      reqValidator.create(t.type({
        body: t.type({
          macAddress: t.string,
          prevDeviceInfo: t.record(t.string, t.any),
          changeRequest: t.type({
            meta: t.union([t.undefined, t.null, t.record(t.string, t.any)]),
            fwProperties: t.record(t.string, t.any)
          })
        })
      }))
    )
    @asyncMethod
    private async handleDeviceUpdate(@requestBody() deviceUpdate: DeviceUpdate): Promise<void> {
      await this.headsUpService.handleDeviceUpdate(deviceUpdate);
    }
  }

  return HeadsUpControllerFactory;
}
