import express from 'express';
import { isNone, Option, some } from 'fp-ts/lib/Option';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, request, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import uuid from 'uuid';
import { QrData, QrDataValidator } from '../../api-v1/pairing/PairingService';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { Device, DeviceActionRule, DeviceActionRules, DeviceActionRulesCreate, DeviceActionRulesCreateCodec, DeviceActionRuleTypeUpsert, DeviceActionRuleTypeUpsertCodec, DeviceCreate, DeviceCreateValidator, DeviceType, DeviceUpdate, DeviceUpdateValidator, SystemMode as DeviceSystemMode, SystemModeCodec as DeviceSystemModeCodec } from '../api';
import { asyncMethod, authorizationHeader, createMethod, deleteMethod, httpController, parseExpand, withResponseType } from '../api/controllerUtils';
import { convertEnumtoCodec } from '../api/enumUtils';
import ForbiddenError from '../api/error/ForbiddenError';
import NotFoundError from '../api/error/NotFoundError';
import ResourceDoesNotExistError from "../api/error/ResourceDoesNotExistError";
import ValidationError from '../api/error/ValidationError'
import UnauthorizedError from '../api/error/UnauthorizedError';
import Request from '../api/Request';
import * as Responses from '../api/response';
import { DeviceService, PuckTokenService } from '../service';
import { DeviceSystemModeServiceFactory } from './DeviceSystemModeService';
import { DirectiveServiceFactory } from './DirectiveService';
import { HealthTest, HealthTestServiceFactory } from './HealthTestService';
import { PairingResponse, PuckPairingResponse } from './PairingService';
import moment from 'moment';
import { authUnion } from '../../auth/authUnion';
import { PuckAuthMiddleware } from '../../auth/PuckAuthMiddleware';

enum HealthTestActions {
  RUN = 'run'
}

const HealthTestActionsCodec = convertEnumtoCodec(HealthTestActions);

export function DeviceControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const puckTokenService = container.get<PuckTokenService>('PuckTokenService');
  const auth = authMiddlewareFactory.create();
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({icd_id: id}));
  const authWithLocation = authMiddlewareFactory.create(async ({ body: { location: { id } } }: Request) => ({ location_id: id }));
  const puckAuthMiddleware = container.get<PuckAuthMiddleware>('PuckAuthMiddleware');

  interface SystemModeRequestBrand {
    readonly SystemModeRequest: unique symbol;
  }

  const UnbrandedSystemModeRequestCodec = t.type({
    target: DeviceSystemModeCodec,
    isLocked: t.union([t.undefined, t.boolean]),
    revertMinutes: t.union([t.undefined, t.Int]),
    revertMode: t.union([t.undefined, DeviceSystemModeCodec]),
    shouldInherit: t.union([t.undefined, t.boolean])
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
      @inject('DirectiveServiceFactory') private directiveServiceFactory: DirectiveServiceFactory,
      @inject('HealthTestServiceFactory') private healthTestServiceFactory: HealthTestServiceFactory,
      @inject('PuckPairingTokenTTL') private readonly puckPairingTokenTTL: number
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
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async getDeviceByMacAdress(@queryParam('macAddress') macAddress: string, @queryParam('expand') expand?: string): Promise<Option<Device>> {
      const expandProps = parseExpand(expand);

      return this.deviceService.getByMacAddress(macAddress, expandProps);
    }

    // Special endpoint for puck to retrieve its own data
    @httpGet('/me',
      'PuckAuthMiddleware',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async getOwnDevice(@request() req: Request, @queryParam('expand') expand?: string): Promise<Option<Device>> {
      const tokenMetadata = req.token;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.puckId) {
        throw new ForbiddenError();
      }

      const expandProps = parseExpand(expand);

      return this.deviceService.getDeviceById(tokenMetadata.puckId, expandProps);
    }

    @httpGet('/:id',
      authUnion(authWithId, puckAuthMiddleware.handler.bind(puckAuthMiddleware)),
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<Device>> {
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
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async updatePartialDevice(@request() req: Request, @requestParam('id') id: string, @requestBody() deviceUpdate: DeviceUpdate): Promise<Option<Device>> {
      const directiveService = this.directiveServiceFactory.create(req);

      return some(await this.deviceService.updatePartialDevice(id, deviceUpdate, directiveService));
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

      const deviceId = await this.mapIcdToMacAddress(id);
      return this.internalDeviceService.setDeviceFwProperties(deviceId, fwProperties);
    }

    @httpPost('/:id/sync',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async syncDevice(@requestParam('id') id: string): Promise<void> {

      const macAddress = await this.mapIcdToMacAddress(id);
      return this.internalDeviceService.syncDevice(macAddress);
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
      const deviceId = await this.mapIcdToMacAddress(id);
      await this.internalDeviceService.removeDevice(deviceId);
      return this.deviceService.removeDevice(id);
    }

    @httpPost('/pair/init',
      auth,
      reqValidator.create(t.type({
        body: QrDataValidator
      }))
    )
    private async scanQrCode(@authorizationHeader() authToken: string, @request() req: Request, @requestBody() qrData: QrData): Promise<PairingResponse> {
      const tokenMetadata = req.token;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.user_id && !tokenMetadata.client_id) {
        throw new ForbiddenError();
      }

      return this.deviceService.scanQrCode(authToken, tokenMetadata.user_id || tokenMetadata.client_id, qrData);
    }

    @httpPost('/pair/init/puck',
      auth,
      reqValidator.create(t.type({
        body: t.partial({
          deviceType: t.literal(DeviceType.PUCK),
          deviceModel: t.string
        })
      }))
    )
    private async initiatePuckPairing(@authorizationHeader() authToken: string, @request() req: Request, @requestBody() qrData: QrData): Promise<PuckPairingResponse> {
      const tokenMetadata = req.token;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.user_id && !tokenMetadata.client_id) {
        throw new ForbiddenError();
      }

      const puckId = uuid.v4()
      const token = await puckTokenService.issueToken(puckId, this.puckPairingTokenTTL, tokenMetadata.client_id, { isInit: true });

      return { id: puckId, token };
    }

    @httpPost('/pair/complete',
      authWithLocation,
      reqValidator.create(t.type({
        body: DeviceCreateValidator
      }))
    )
    @createMethod
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async pairDevice(@authorizationHeader() authToken: string, @request() req: Request, @requestBody() deviceCreate: DeviceCreate): Promise<Option<Device | { device: Device, token: string }>> {
      const tokenMetadata = req.token;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.user_id && !tokenMetadata.client_id) {
        throw new ForbiddenError();
      } else if (deviceCreate.deviceType === DeviceType.PUCK) {
        throw new ValidationError('Cannot pair puck.');
      }

      const device = await this.deviceService.pairDevice(authToken, deviceCreate);


      return some(device);
    }

    @httpPost('/pair/complete/puck',
      'PuckAuthMiddleware',
      reqValidator.create(t.type({
        body: DeviceCreateValidator
      }))
    )
    @createMethod
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async completePuckPairing(@authorizationHeader() authToken: string, @request() req: Request, @requestBody() deviceCreate: DeviceCreate): Promise<Option<{ device: Device, token: string }>> {
      const tokenMetadata = req.token;

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.puckId || !tokenMetadata.isInit) {
        throw new ForbiddenError();
      } else if (deviceCreate.deviceType !== DeviceType.PUCK) {
        throw new ValidationError();
      }

      const device = await this.deviceService.pairDevice(authToken, { ...deviceCreate, id: tokenMetadata.puckId });

      return some({
        device,
        // Puck token has no expiration
        token: await puckTokenService.issueToken(tokenMetadata.puckId, undefined, tokenMetadata.client_id, {
          macAddress: device.macAddress,
          locationId: device.location.id
        })
      });
    }

    @httpPost('/:id/systemMode',
      // auth is deferred to  API v1 call
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: SystemModeRequestCodec
      }))
    )
    @asyncMethod
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async setDeviceSystemMode(
      @request() req: Request,
      @requestParam('id') id: string,
      @requestBody() data: SystemModeRequest
    ): Promise<Option<Device>> {
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
          shouldInherit: data.shouldInherit,
          target: data.target,
          ...(!isSleep ? {} : {
            revertMode: data.revertMode,
            revertMinutes: data.revertMinutes,
            revertScheduledAt: moment(now).add(data.revertMinutes, 'minutes').toISOString()
          })
        }
      });

      return some(model);
    }

    @httpPost('/:id/reset',
      // Auth is deferred to  API v1 call
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          target: t.literal('power')
        })
      }))
    )
    @asyncMethod
    private async rebootDevice(@request() req: Request, @requestParam('id') id: string): Promise<void> {
      const directiveService = this.directiveServiceFactory.create(req);
      return directiveService.reboot(id);
    }

    @httpPost('/:id/healthTest/:action',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          action: HealthTestActionsCodec
        })
      }))
    )
    @asyncMethod
    private async healthTest(@request() req: Request, @requestParam('id') id: string, @requestParam('action') action: string): Promise<HealthTest> {
      const healthTestService = this.healthTestServiceFactory.create(req);
      const device = await this.deviceService.getDeviceById(id);

      if (isNone(device)) {
        throw new ResourceDoesNotExistError();
      }

      switch (action) {
        case HealthTestActions.RUN:
        default: {
          return healthTestService.run(device.value.macAddress, id);
        }
      }
    }

    @httpGet('/:id/healthTest',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getLatestHealthTest(@request() req: Request, @requestParam('id') id: string): Promise<HealthTest | {}> {
      const healthTestService = this.healthTestServiceFactory.create(req);
      const device = await this.deviceService.getDeviceById(id);

      if (isNone(device)) {
        throw new ResourceDoesNotExistError();
      }

      const latestHealthTest = await healthTestService.getLatest(device.value.macAddress);

      if (latestHealthTest === null) {
        throw new NotFoundError();
      }

      return latestHealthTest;
    }

    @httpGet('/:id/healthTest/:roundId',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          roundId: t.string
        })
      }))
    )
    private async getHealthTestByRoundId(@request() req: Request, @requestParam('id') id: string,
                                         @requestParam('roundId') roundId: string): Promise<HealthTest | {}> {

      const healthTestService = this.healthTestServiceFactory.create(req);
      const device = await this.deviceService.getDeviceById(id);

      if (isNone(device)) {
        throw new ResourceDoesNotExistError();

      }

      const healthTest = await (roundId === 'latest' ?
          healthTestService.getLatest(device.value.macAddress) :
          healthTestService.getTestResultByRoundId(roundId));

      if (healthTest === null) {
        throw new NotFoundError();
      }

      if (healthTest.deviceId !== device.value.macAddress) {
        throw new ForbiddenError();
      }

      return healthTest;
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
      if (isNone(device)) {
        throw new ResourceDoesNotExistError('Device does not exist.');
      }
      return device.value.macAddress;
    }

    @httpGet('/:id/actionRules',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getActionRules(@requestParam('id') id: string): Promise<DeviceActionRules> {
      return this.internalDeviceService.getActionRules(id);
    }


    @httpPost('/:id/actionRules',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: DeviceActionRulesCreateCodec
      }))
    )
    private async upsertActionRules(@requestParam('id') id: string, @requestBody() actionRules: DeviceActionRulesCreate): Promise<DeviceActionRules> {
      return this.internalDeviceService.upsertActionRules(id, actionRules);
    }

    @httpDelete('/:id/actionRules/:actionRuleId',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          actionRuleId: t.string
        })
      }))
    )
    @deleteMethod
    private async removeActionRule(@requestParam('id') id: string, @requestParam('actionRuleId') actionRuleId: string): Promise<void> {
      return this.internalDeviceService.removeActionRule(id, actionRuleId);
    }
  }

  return DeviceController;
}