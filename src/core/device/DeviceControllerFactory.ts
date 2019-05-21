import { interfaces, httpGet, httpPost, httpDelete, queryParam, requestParam, requestBody, requestHeaders, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { Device, DeviceUpdate, DeviceUpdateValidator, DeviceCreate, DeviceCreateValidator } from '../api';
import DeviceService from './DeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import * as t from 'io-ts';
import { httpController, parseExpand, deleteMethod, createMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import { QrData, PairingData, QrDataValidator } from '../../api-v1/pairing/PairingService';

export function DeviceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ icd_id: id }));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { location: { id } } }: Request) => ({ location_id: id }));

  @httpController({ version: apiVersion }, '/devices')
  class DeviceController extends BaseHttpController {
    constructor(
      @inject('DeviceService') private deviceService: DeviceService
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
    private async getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Device | {}> {
      const expandProps = parseExpand(expand);

      return this.deviceService.getDeviceById(id, expandProps);
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

    @httpPost('/pair/qr',
      auth,
      reqValidator.create(t.type({
        body: QrDataValidator 
      }))
    )
    private async scanQrCode(@requestHeaders('Authorization') authToken: string, @requestBody() qrData: QrData): Promise<PairingData> {

      return this.deviceService.scanQrCode(authToken, qrData);
    }

    @httpPost('/pair',
      authWithLocation,
      reqValidator.create(t.type({
        body: DeviceCreateValidator
      }))
    )
    @createMethod
    private async pairDevice(@requestHeaders('Authorization') authToken: string, @requestBody() deviceCreate: DeviceCreate): Promise<Device> {

      return this.deviceService.pairDevice(authToken, deviceCreate);
    }
  }

  return DeviceController;
}