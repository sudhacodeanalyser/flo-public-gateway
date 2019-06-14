import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, requestBody, requestParam, request } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import { PairingData, QrData, QrDataValidator } from '../../api-v1/pairing/PairingService';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Device, DeviceSystemMode, DeviceSystemModeCodec, DeviceCreate, DeviceCreateValidator, DeviceUpdate, DeviceUpdateValidator } from '../api';
import { authorizationHeader, createMethod, deleteMethod, asyncMethod, httpController, parseExpand } from '../api/controllerUtils';
import Request from '../api/Request';
import * as Responses from '../api/response';
import { DeviceService } from '../service';
import { DeviceSystemModeServiceFactory } from './DeviceSystemModeService';
import { DirectiveServiceFactory } from './DirectiveService';
import ResourceDoesNotExistError from "../api/error/ResourceDoesNotExistError";

export function DeviceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({icd_id: id}));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { location: { id } } }: Request) => ({ location_id: id }));

  interface SystemModeRequestBrand {
    readonly SystemModeRequest: unique symbol;
  }

  const UnbrandedSystemModeRequestCodec = t.type({
    target: DeviceSystemModeCodec,
    isLocked: t.union([t.undefined, t.boolean]),
    revertMinutes: t.union([t.undefined, t.Int]),
    revertMode: t.union([t.undefined, DeviceSystemModeCodec])
  });

  type UnbrandedSystemModeRequest = t.TypeOf<typeof UnbrandedSystemModeRequestCodec>;

  const SystemModeRequestCodec = t.brand(
    UnbrandedSystemModeRequestCodec,
    (body): body is t.Branded<UnbrandedSystemModeRequest, SystemModeRequestBrand> => {
      const {
        target,
        isLocked,
        revertMinutes,
        revertMode
      } = body;

      // System mode can only be locked to sleep, i.e. "forced sleep"
      if (isLocked !== undefined && target !== DeviceSystemMode.SLEEP) {
        return false;
      // Revert minutes & revert mode must both be specified and
      // can only apply to sleep mode
      } else if (
        (revertMinutes !== undefined && revertMode === undefined) ||
        (revertMode !== undefined && revertMinutes === undefined) ||
        (revertMinutes !== undefined && revertMode !== undefined && target !== DeviceSystemMode.SLEEP) 
      ) {
        return false;
      } else {
        return true;
      }
    },
    'SystemModeRequest'
  );

  type SystemModeRequest = t.TypeOf<typeof SystemModeRequestCodec>;

  @httpController({version: apiVersion}, '/devices')
  class DeviceController extends BaseHttpController {
    constructor(
      @inject('DeviceService') private deviceService: DeviceService,
      @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
      @inject('DeviceSystemModeServiceFactory') private deviceSystemModeServiceFactory: DeviceSystemModeServiceFactory,
      @inject('DirectiveServiceFactory') private directiveServiceFactory: DirectiveServiceFactory
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
    private async updatePartialDevice(@request() req: Request, @requestParam('id') id: string, @requestBody() deviceUpdate: DeviceUpdate): Promise<Responses.DeviceResponse> {
      const directiveService = this.directiveServiceFactory.create(req);

      return Responses.Device.fromModel(await this.deviceService.updatePartialDevice(id, deviceUpdate, directiveService));
    }

    @httpPost('/:icd/fwproperties',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        // TODO Do not allow empty
        body: t.record(t.string, t.any)
      }))
    )
    private async setDeviceFwProperties(@requestParam('icd') icd: string, @requestBody() fwProperties: any): Promise<void> {

      const deviceId = await this.mapIcdToMacAddress(icd);
      return this.internalDeviceService.setDeviceFwProperties(deviceId, fwProperties);
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

    @httpPost('/:id/system-mode',
      // auth is deferred to  API v1 call
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: SystemModeRequestCodec
      }))
    )
    @asyncMethod
    private async setDeviceSystemMode(
      @request() req: Request, 
      @requestParam('id') id: string, 
      @requestBody() data: SystemModeRequest
    ): Promise<Responses.DeviceResponse> {
      const deviceSystemModeService = this.deviceSystemModeServiceFactory.create(req);
      const isSleep = this.isSleep(data);
      const now = isSleep ? new Date().toISOString() : 'undefined';

      if (isSleep) {
        await deviceSystemModeService.sleep(id, SystemModeRequestCodec.encode(data).revertMinutes as number, data.revertMode as DeviceSystemMode);
      } else if (this.isForcedSleepEnable(data)) {
        await deviceSystemModeService.enableForcedSleep(id);
      } else if (this.isForcedSleepDisable(data)) {
        await deviceSystemModeService.disableForcedSleep(id);
      } else {
        await deviceSystemModeService.setSystemMode(id, data.target)
      }

      // API v1 call needs to be made first to make sure we have permission to modify the 
      // device record
      const model = await this.deviceService.updatePartialDevice(id, { 
        systemMode: {
          shouldInherit: false,
          target: data.target,
          ...(!isSleep ? {} : {
            revertMode: data.revertMode,
            revertMinutes: data.revertMinutes,
            revertScheduledAt: now
          })
        } 
      });
      return Responses.Device.fromModel(model);
    }

    private isSleep({ target, revertMinutes, revertMode }: SystemModeRequest): boolean {
      return revertMinutes !== undefined && revertMode !== undefined && target === DeviceSystemMode.SLEEP;
    }

    private isForcedSleepEnable({ target, isLocked }: SystemModeRequest): boolean {
      return isLocked === true && target === DeviceSystemMode.SLEEP;
    }

    private isForcedSleepDisable({ target, isLocked }: SystemModeRequest): boolean {
      return isLocked === false && target === DeviceSystemMode.SLEEP;
    }

    private async mapIcdToMacAddress(icd: string): Promise<string> {

      const device = await this.deviceService.getDeviceById(icd);
      if (_.isEmpty(device)) {
        throw new ResourceDoesNotExistError('Device does not exist.');
      }
      return (device as Device).macAddress;
    }

  }

  return DeviceController;
}