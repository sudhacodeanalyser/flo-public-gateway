import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import { PairingData, QrData, QrDataValidator } from '../../api-v1/pairing/PairingService';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Device, DeviceCreate, DeviceCreateValidator, DeviceUpdate, DeviceUpdateValidator } from '../api';
import { authorizationHeader, createMethod, deleteMethod, httpController, parseExpand } from '../api/controllerUtils';
import Request from '../api/Request';
import * as Responses from '../api/response';
import DeviceService from './DeviceService';

export function DeviceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({icd_id: id}));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { location: { id } } }: Request) => ({ location_id: id }));

  @httpController({version: apiVersion}, '/devices')
  class DeviceController extends BaseHttpController {
    constructor(
      @inject('DeviceService') private deviceService: DeviceService,
      @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService
    ) {
      super();
    }

    @httpGet('/',
      authMiddlewareFactory.create(async ({ query: { macAddress } }) => ({ device_id: macAddress })),
      reqValidator.create(t.type({
        query: t.type({
          macAddress: t.string,
          expand: t.union([t.undefined, t.string])
        })
      }))
    )
    private async getDeviceByMacAdress(@queryParam('macAddress') macAddress: string, @queryParam('expand') expand?: string): Promise<Responses.DeviceResponse | {}> {
      const expandProps = parseExpand(expand);
      const deviceModel = await this.deviceService.getByMacAddress(macAddress, expandProps);

      if (deviceModel === null) {
        return {};
      }

      return Responses.Device.fromModel(deviceModel);
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
    private async getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Responses.DeviceResponse | {}> {
      const expandProps = parseExpand(expand);

      const deviceModel = await this.deviceService.getDeviceById(id, expandProps);

      if (_.isEmpty(deviceModel)) {
        return {};
      }

      return Responses.Device.fromModel(deviceModel as Device);
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
    private async updatePartialDevice(@requestParam('id') id: string, @requestBody() deviceUpdate: DeviceUpdate): Promise<Responses.DeviceResponse> {

      return Responses.Device.fromModel(await this.deviceService.updatePartialDevice(id, deviceUpdate));
    }

    @httpPost('/:id/fwproperties',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        // TODO Do not allow empty
        body: t.record(t.string, t.any)
      }))
    )
    private async setDeviceFwProperties(@requestParam('id') id: string, @requestBody() fwProperties: any): Promise<void> {

      return this.internalDeviceService.setDeviceFwProperties(id, fwProperties);
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

    @httpPost('/pair/init',
      auth,
      reqValidator.create(t.type({
        body: QrDataValidator
      }))
    )
    private async scanQrCode(@authorizationHeader() authToken: string, @requestBody() qrData: QrData): Promise<PairingData> {

      return this.deviceService.scanQrCode(authToken, qrData);
    }

    @httpPost('/pair/complete',
      authWithLocation,
      reqValidator.create(t.type({
        body: DeviceCreateValidator
      }))
    )
    @createMethod
    private async pairDevice(@authorizationHeader() authToken: string, @requestBody() deviceCreate: DeviceCreate): Promise<Device> {

      return this.deviceService.pairDevice(authToken, deviceCreate);
    }
  }

  return DeviceController;
}