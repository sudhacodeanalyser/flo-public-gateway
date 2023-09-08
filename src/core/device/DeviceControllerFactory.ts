import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, queryParam, request, requestBody, requestParam, all } from 'inversify-express-utils';
import * as t from 'io-ts';
import * as uuid from 'uuid';
import { QrData, QrDataValidator } from '../../api-v1/pairing/PairingService';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { DependencyFactoryFactory, Device, DeviceActionRules, DeviceActionRulesCreate, DeviceActionRulesCreateCodec, DeviceCreate, DeviceCreateValidator, DeviceType,
  DeviceUpdate, DeviceUpdateValidator, SystemMode as DeviceSystemMode, SystemModeCodec as DeviceSystemModeCodec, HardwareThresholdsCodec, HardwareThresholds, FirmwareInfo, SsidCredentials,
  BaseLteCodec, BaseLte, SsidCredentialsWithContext, LteContext,  DeviceSyncBodyCodec, DeviceSyncOptions, ConnectionInfoCodec, ConnectionMethod, PropExpand  } from '../api';
import { asyncMethod, authorizationHeader, createMethod, deleteMethod, httpController, parseExpand, withResponseType } from '../api/controllerUtils';
import { convertEnumtoCodec } from '../api/enumUtils';
import ForbiddenError from '../api/error/ForbiddenError';
import NotFoundError from '../api/error/NotFoundError';
import ResourceDoesNotExistError from "../api/error/ResourceDoesNotExistError";
import ValidationError from '../api/error/ValidationError'
import UnauthorizedError from '../api/error/UnauthorizedError';
import Request, { extractIpAddress } from '../api/Request';
import * as Responses from '../api/response';
import { DeviceService, PuckTokenService, LocationService, LteService } from '../service';
import { DeviceSystemModeServiceFactory } from './DeviceSystemModeService';
import { DirectiveServiceFactory } from './DirectiveService';
import { HealthTest, HealthTestServiceFactory } from './HealthTestService';
import { PairingResponse, PuckPairingResponse } from './PairingService';
import moment from 'moment';
import { authUnion } from '../../auth/authUnion';
import { PuckAuthMiddleware } from '../../auth/PuckAuthMiddleware';
import { MachineLearningService } from '../../machine-learning/MachineLearningService';
import ConcurrencyService from '../../concurrency/ConcurrencyService';
import ConflictError from '../api/error/ConflictError';
import { DeviceSyncService } from './DeviceSyncService';
import * as _ from 'lodash';
import { getEventInfo } from '../api/eventInfo';
import Logger from 'bunyan';

const { isNone, some  } = O;
type Option<T> = O.Option<T>;

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
  const authWithLocationParents = authMiddlewareFactory.create(async ({ body: { location: { id: locationId }}}: Request, depFactoryFactory: DependencyFactoryFactory) => {
    const locationService = depFactoryFactory<LocationService>('LocationService')();
    const parentIds = await locationService.getAllParentIds(locationId);

    return {
      location_id: [locationId, ...parentIds]
    };
  })
  const authWithParents = authMiddlewareFactory.create(async ({ params: { id }, query: { macAddress } }: Request, depFactoryFactory: DependencyFactoryFactory) => {
    const deviceService = depFactoryFactory<DeviceService>('DeviceService')();
    const locationService = depFactoryFactory<LocationService>('LocationService')();
    const device = id ?
      O.toNullable(await deviceService.getDeviceById(id, { $select: { location: { $select: { id: true } } } })) :
      O.toNullable(await deviceService.getByMacAddress(macAddress?.toString() || '', { $select: { location: { $select: { id: true } } } }));

    if (!device) {
      return {
        device_id: macAddress,
        icd_id: id
      };
    }

    const parentIds = await locationService.getAllParentIds(device.location.id);

    return {
      location_id: [device.location.id, ...parentIds],
      device_id: macAddress,
      icd_id: id
    };
  });

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
        (revertMinutes !== undefined && revertMode !== undefined && target !== DeviceSystemMode.SLEEP) ||
        revertMode === DeviceSystemMode.SLEEP
      ) {
        return false;
      } else {
        return true;
      }
    },
    'SystemModeRequest'
  );

  type SystemModeRequest = t.TypeOf<typeof SystemModeRequestCodec>;

  type ConnectionInfoRequest = t.TypeOf<typeof ConnectionInfoCodec>;

  @httpController({version: apiVersion}, '/devices')
  class DeviceController extends BaseHttpController {
    constructor(
      @inject('Logger') private readonly logger: Logger,
      @inject('DeviceService') private deviceService: DeviceService,
      @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
      @inject('DeviceSystemModeServiceFactory') private deviceSystemModeServiceFactory: DeviceSystemModeServiceFactory,
      @inject('DirectiveServiceFactory') private directiveServiceFactory: DirectiveServiceFactory,
      @inject('HealthTestServiceFactory') private healthTestServiceFactory: HealthTestServiceFactory,
      @inject('PuckPairingTokenTTL') private readonly puckPairingTokenTTL: number,
      @inject('MachineLearningService') private mlService: MachineLearningService,
      @inject('LteService') private lteService: LteService,
      @inject('ConcurrencyService') private concurrencyService: ConcurrencyService,
      @inject('DeviceSyncService') private deviceSyncService: DeviceSyncService
    ) {
      super();
    }

    @httpGet('/',
      reqValidator.create(t.type({
        query: t.type({
          macAddress: t.string,
          expand: t.union([t.undefined, t.string])
        })
      })),
      authWithParents
    )
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async getDeviceByMacAdress(@queryParam('macAddress') macAddress: string, @queryParam('expand') expand?: string): Promise<Option<Device>> {
      const expandProps = parseExpand(expand);
      this.logger.trace({method: 'getDeviceByMacAdress', action: "get", macAddress, expand, user: this.httpContext?.request });
      const device = await this.deviceService.getByMacAddress(macAddress, expandProps);
      return device;
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

    // Special endpoint for LTE device creation - Admins only
    @httpPost(
      '/lte',
      auth,
      reqValidator.create(t.type({
        body: BaseLteCodec
      }))
    )
    @createMethod
    private async createLte(@requestBody() lte: BaseLte): Promise<void> {
      return this.lteService.createLte(lte);
    }

    // Special endpoint for LTE device credentials - Admins only
    @httpPost(
      '/lte/credentials',
      auth,
      reqValidator.create(t.type({
        body: t.type({
          data: t.string
        })
      }))
    )
    private async retrieveSsidCredentials(@requestBody() { data }: { data: string }): Promise<SsidCredentialsWithContext> {
      const maybeSsidCredentials = await this.lteService.getSsidCredentials(data);
      return pipe(
        maybeSsidCredentials,
        O.fold(
          () => {
            throw new NotFoundError('LTE device not found.')
          },
          ssidCredentials => ssidCredentials
        )
      );
    }

    // Special endpoint for retrieving LTE device QR Code - Admins only
    @httpPost(
      '/lte/qr-code',
      auth,
      reqValidator.create(t.type({
        body: t.type({
          imei: t.string
        })
      }))
    )
    private async retrieveQrCode(@requestBody() { imei }: { imei: string}): Promise<LteContext> {
      return this.lteService.retrieveQrCode(imei);
    }

    @httpPost('/connection',
    reqValidator.create(t.type({
      query: t.type({
        macAddress: t.string
      }),
      body: ConnectionInfoCodec
    })),
    authWithParents
    )
    @asyncMethod
    private async setConnectionMethodByAddr(
      @request() req: Request,
      @queryParam('macAddress') macAddress: string,
      @requestBody() con: ConnectionInfoRequest
    ): Promise<void> {

      const maybeDevice = await this.deviceService.getByMacAddress(macAddress, { $select: { id: true } });
      const device = pipe(maybeDevice, O.fold(
        () => {
            throw new NotFoundError()
          },
        (s: Device) => s)
      )

      await this.setConnectionMethod(req, device.id, con)
      return
    }

    @httpGet('/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      })),
      authUnion(authWithParents, puckAuthMiddleware.handler.bind(puckAuthMiddleware))
    )
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async getDevice(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<Device>> {
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
      })),
      authWithParents
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
        }),
        body: DeviceSyncBodyCodec
      }))
    )
    private async syncDevice(@requestParam('id') id: string, @requestBody() body: DeviceSyncOptions): Promise<void> {
      await this.syncById(id, body)
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
    private async removeDevice(@authorizationHeader() authToken: string, @request() req: Request, @requestParam('id') id: string): Promise<void> {
      const resourceEventInfo = getEventInfo(req);
      const macAddress = await this.mapIcdToMacAddress(id);
      await this.lteService.unlinkDevice(id, macAddress);
      await this.internalDeviceService.removeDevice(macAddress);
      return this.deviceService.removeDevice(id, resourceEventInfo);
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
      authWithLocationParents,
      reqValidator.create(t.type({
        body: DeviceCreateValidator
      }))
    )
    @createMethod
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async pairDevice(@authorizationHeader() authToken: string, @request() req: Request, @requestBody() deviceCreate: DeviceCreate): Promise<Option<Device | { device: Device, token: string }>> {
      const tokenMetadata = req.token;
      const resourceEventInfo = getEventInfo(req);

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.user_id && !tokenMetadata.client_id) {
        throw new ForbiddenError();
      } else if (deviceCreate.deviceType === DeviceType.PUCK) {
        throw new ValidationError('Cannot pair puck.');
      }

      const lockKey = `pairing:mutex:${deviceCreate.macAddress}`;
      if (!(await this.concurrencyService.acquireLock(lockKey, 60))) {
        throw new ConflictError('Device pairing in process.');
      }
      try {
        const device = await this.deviceService.pairDevice(authToken, deviceCreate, resourceEventInfo);
        if (deviceCreate.connectivity?.lte?.qrCode) {
          await this.lteService.linkDevice(device.id, device.macAddress, deviceCreate.connectivity?.lte?.qrCode);
        }
        return some(device);
      } finally {
        await this.concurrencyService.releaseLock(lockKey);
      }
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
      const resourceEventInfo = getEventInfo(req);

      if (!tokenMetadata) {
        throw new UnauthorizedError();
      } else if (!tokenMetadata.puckId || !tokenMetadata.isInit) {
        throw new ForbiddenError();
      } else if (deviceCreate.deviceType !== DeviceType.PUCK) {
        throw new ValidationError();
      }

      const device = await this.deviceService.pairDevice(authToken, { ...deviceCreate, id: tokenMetadata.puckId }, resourceEventInfo);

      return some({
        device,
        // Puck token has no expiration
        token: await puckTokenService.issueToken(tokenMetadata.puckId, undefined, tokenMetadata.client_id, {
          macAddress: device.macAddress,
          locationId: device.location.id
        })
      });
    }

    @httpPost('/:id/connection',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: ConnectionInfoCodec
      }))
    )
    @asyncMethod
    private async setConnectionMethod(
      @request() req: Request,
      @requestParam('id') id: string,
      @requestBody() con: ConnectionInfoRequest
    ): Promise<void> {

      await this.syncById(id);
      const maybeDevice = await this.deviceService.getDeviceById(id, { $select: { id: true, macAddress: true, connectivity: true } });
      const device = pipe(maybeDevice, O.fold(
        () => {
            throw new NotFoundError()
          },
        (s: Device) => s)
      )

      switch (con.method){
        case ConnectionMethod.LTE:
          if (con.lte !== undefined){
            await this.lteService.linkDevice(id, device.macAddress, con.lte.qrCode)
          }
          break

        default:
          const ssid = device.connectivity?.ssid
          if (ssid === undefined){
            // we dont know much of anything, unlink it if linked
            await this.lteService.unlinkDevice(id, device.macAddress)
            return
          }

          const maybeCurrentCredentials = await this.lteService.getCurrentCredentials(id)
          const currentCredentials = O.toNullable(maybeCurrentCredentials)

          if (currentCredentials?.ssid !== ssid) {
            await this.lteService.unlinkDevice(id, device.macAddress)
          }
      }

      return;
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
      authWithParents,
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

    @all('/:id/pes/*',
      authMiddlewareFactory.create(undefined, 'ALL/api/v2/devices/$/pes/*')
    )
    private async forwardToPES(@request() req: Request, @requestBody() body: any, @requestParam('id') id: string): Promise<any> {
      const device = await this.deviceService.getDeviceById(id, {
        $select: {
          macAddress: true
        }
      });

      if (isNone(device)) {
        throw new NotFoundError('Device not found.');
      }

      const subPath = req.url.toLowerCase().split('pes/')[1];
      const path = `${ device.value.macAddress }/pes/${ subPath }`;

      return this.mlService.forward(req.method, path, body);
    }

    @all('/:id/floSense/*',
      authMiddlewareFactory.create(undefined, 'ALL/api/v2/devices/$/floSense/*')
    )
    private async forwardToFloSense(@request() req: Request, @requestBody() body: any, @requestParam('id') id: string): Promise<any> {
      const device = await this.deviceService.getDeviceById(id, {
        $select: {
          macAddress: true
        }
      });

      if (isNone(device)) {
        throw new NotFoundError('Device not found.');
      }

      const subPath = req.url.toLowerCase().split('flosense/')[1];
      const path = `${ device.value.macAddress }/floSense/${ subPath }`;

      return this.mlService.forward(req.method, path, body);
    }

    // For admins only. Allows transfering devices across accounts.
    @httpPost(
      '/:id/transfer',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          locationId: t.string
        })
      }))
    )
    @withResponseType<Device, Responses.Device>(Responses.Device.fromModel)
    private async transferDevice(@requestParam('id') id: string, @request() req: Request, @requestBody() { locationId }: { locationId: string }): Promise<Option<Device>> {
      const resourceEventInfo = getEventInfo(req);
      return some(await this.deviceService.transferDevice(id, locationId, resourceEventInfo));
    }


    /* helpers */
    private async syncById(id: string, opts: DeviceSyncOptions = {}): Promise<void> {
      const device = await this.deviceService.getDeviceById(id, { $select: { id: true, macAddress: true } })
      if (isNone(device)) {
        throw new ResourceDoesNotExistError('Device does not exist.')
      }
      return this.deviceSyncService.synchronize(device.value, opts)
    }

  }

  return DeviceController;
}
