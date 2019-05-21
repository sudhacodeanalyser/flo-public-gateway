import {
  BaseHttpController,
  httpDelete,
  httpGet,
  httpPost,
  interfaces,
  queryParam,
  requestBody,
  requestParam
} from 'inversify-express-utils';
import {Container, inject} from 'inversify';
import {Device, DeviceResponse, DeviceUpdate, DeviceUpdateValidator} from '../api';
import DeviceService from './DeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import * as t from 'io-ts';
import {deleteMethod, httpController, parseExpand} from '../api/controllerUtils';
import Request from '../api/Request';
import {InternalDeviceServiceFetcher} from "../../internal-device-service/InternalDeviceServiceFetcher";
import _ from 'lodash';
import {FwProperties, FwPropertiesValidator} from "../../internal-device-service/models";

export function DeviceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({params: {id}}: Request) => ({icd_id: id}));

  @httpController({version: apiVersion}, '/devices')
  class DeviceController extends BaseHttpController {
    constructor(
      @inject('DeviceService') private deviceService: DeviceService,
      @inject('InternalDeviceServiceFetcher') private internalDeviceServiceFetcher: InternalDeviceServiceFetcher
    ) {
      super();
    }

    @httpGet('/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<DeviceResponse | {}> {
      const expandProps = parseExpand(expand);
      const additionalProperties = _.pick(
        await this.internalDeviceServiceFetcher.getDevice(id),
        ['fwProperties',
          'fwVersion',
          'lastHeardFromTime',
          'isConnected']
      );

      const device = await this.deviceService.getDeviceById(id, expandProps);

      if (device === null) {
        return {}
      }

      return {...device, ...additionalProperties}
    }

    @httpPost('/:id',
      authWithId,
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

    @httpPost('/:id/fwproperties',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        // TODO Do not allow empty
        body: FwPropertiesValidator
      }))
    )
    private async setDeviceFwProperties(@requestParam('id') id: string, @requestBody() fwProperties: FwProperties): Promise<void> {

      return this.internalDeviceServiceFetcher.setDeviceFwProperties(id, fwProperties);
    }

    @httpDelete('/:id',
      authWithId,
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