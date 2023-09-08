import Logger from 'bunyan';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { PairingService, QrData } from '../../api-v1/pairing/PairingService';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceType, DeviceUpdate, PropExpand, ValveState, FirmwareInfo, DeviceStats, DeviceAlertStats } from '../api';
import ConflictError from '../api/error/ConflictError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { DeviceResolver } from '../resolver';
import { EntityActivityAction, EntityActivityService, ResourceEventService, EntityActivityType, LocationService, UserService } from '../service';
import { SessionService } from '../session/SessionService';
import { DirectiveService } from './DirectiveService';
import { PairingResponse } from './PairingService';
import { MachineLearningService } from '../../machine-learning/MachineLearningService';
import { interfaces } from 'inversify-express-utils';
import { injectableHttpContext } from '../../cache/InjectableHttpContextUtils';
import Request from '../api/Request';
import { NotificationService } from '../notification/NotificationService';
import moment from 'moment-timezone';
import PairInitTable from './PairInitTable';
import { ResourceEventAction, ResourceEventInfo, ResourceEventType } from '../api/model/ResourceEvent';
import { stripNulls } from '../api/controllerUtils';

const { isNone, fromNullable } = O;
type Option<T> = O.Option<T>;

@injectable()
class DeviceService {
  /* Contains minimal essential device info as well as essential 
   * connectivity location and account information 
   */
  public static ESSENTIAL_DEVICE_DETAILS: PropExpand = { 
    $select: {
      id: true,
      serialNumber: true,
      macAddress: true,
      nickname: true,
      isPaired: true,
      deviceModel: true,
      deviceType: true,
      fwVersion: true,
      lastHeardFromTime: true,
      createdAt: true,
      updatedAt: true,
      irrigationType: true,
      prvInstallation: true,
      purchaseLocation: true,
      installStatus: true,
      connectivity: true,
      location: { 
        $select: { 
          id: true, 
          address: true,
          address2: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          timezone: true, 
          class: true,
          account: { 
            $select: { 
              id: true, 
              type: true 
            } 
          } 
        }
      } 
    } 
  };

  /* Contains full device as well as essential 
   * connectivity, location and account info 
   */
  public static ALL_DEVICE_DETAILS: PropExpand = { 
    $select: {
      $rest: true,
      connectivity: true,
      location: { 
        $select: { 
          id: true, 
          address: true,
          address2: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          timezone: true, 
          class: true,
          account: { 
            $select: { 
              id: true, 
              type: true 
            } 
          } 
        }
      } 
    } 
  };

  private locationServiceFactory: () => LocationService;
  private sessionServiceFactory: () => SessionService;
  private userServiceFactory: () => UserService;

  constructor(
    @injectableHttpContext private httpContext: interfaces.HttpContext,
    @inject('DeviceResolver') private deviceResolver: DeviceResolver,
    @inject('PairingService') private apiV1PairingService: PairingService,
    @inject('Logger') private readonly logger: Logger,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService,
    @inject('ResourceEventService') private resourceEventService: ResourceEventService,
    @inject('MachineLearningService') private mlService: MachineLearningService,
    @inject('NotificationService') private notificationService: NotificationService,
    @inject('PairInitTable') private pairInitTable: PairInitTable,
    @inject('PairInitTTL') private pairInitTTL: number
  ) {
    // console.log('DeviceService constructor');
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
    this.sessionServiceFactory = depFactoryFactory<SessionService>('SessionService');
    this.userServiceFactory = depFactoryFactory<UserService>('UserService');
  }

  public async getDeviceById(id: string, expand?: PropExpand): Promise<Option<Device>> {
    const device: Device | null = await this.deviceResolver.get(id, expand);
    return fromNullable(device);
  }

  public async getByMacAddress(macAddress: string, expand?: PropExpand): Promise<Option<Device>> {
    this.logger.trace({method: 'getByMacAddress', action: "get", macAddress, expand, user: this.httpContext?.request });
    const device = await this.deviceResolver.getByMacAddress(macAddress, expand);
    this.logger.trace({method: 'getByMacAddress', action: "get-result", device });

    return fromNullable(device);
  }

  public async updatePartialDevice(id: string, deviceUpdate: DeviceUpdate, directiveService?: DirectiveService): Promise<Device> {
    const device: Device | null = await this.deviceResolver.get(id);

    if (device == null) {
      throw new ResourceDoesNotExistError('Device does not exist');
    }

    // TODO: Make all these operations parallel
    await this.internalDeviceService.upsertDevice(device.macAddress, deviceUpdate);
    let updatedDevice = await this.deviceResolver.updatePartial(id, deviceUpdate);

    if (directiveService && deviceUpdate.valve) {
      if (deviceUpdate.valve.target === ValveState.OPEN) {
        await directiveService.openValve(id);
      } else if (deviceUpdate.valve.target === ValveState.CLOSED) {
        await directiveService.closeValve(id);
      }
    }

    if (deviceUpdate.learning) {
      const updatedMLProps = await this.mlService.updateLearning(device.macAddress, {
        learning: deviceUpdate.learning
      });
      updatedDevice = {
        ...updatedDevice,
        learning: {
          ...updatedDevice.learning,
          ...updatedMLProps.learning
        }
      }
    }

    if (deviceUpdate.pes || deviceUpdate.floSense) {
      const updatedMLProps = await this.mlService.update(device.macAddress, {
        ...(deviceUpdate.pes && { pes: deviceUpdate.pes }),
        ...(deviceUpdate.floSense && { floSense: deviceUpdate.floSense })
      });
      const updatedProps = {
        ...updatedDevice,
        ...updatedMLProps
      };

      await this.entityActivityService.publishEntityActivity(
        EntityActivityType.DEVICE,
        EntityActivityAction.UPDATED,
        updatedProps
      );

      return updatedProps;
    }

    if (deviceUpdate.healthTest) {
      const location = await this.locationServiceFactory().getLocation(device.location.id, {
        $select: {
          timezone: true
        }
      });

      if (O.isNone(location)) {
        throw new ResourceDoesNotExistError('Location does not exist');
      }

      const healthTestConfig = deviceUpdate.healthTest.config;
      const timezone = location.value.timezone || 'Etc/UTC';
      const startTime = moment.tz(healthTestConfig.start, 'HH:mm', timezone).utc().format('HH:mm');
      const endTime = moment.tz(healthTestConfig.end, 'HH:mm', timezone).utc().format('HH:mm');

      const userId = (this?.httpContext?.request as Request)?.token?.user_id;
      const fwProperties = {
        ht_times_per_day: healthTestConfig.timesPerDay,
        ht_scheduler_start: startTime,
        ht_scheduler_end: endTime
      };

      await this.internalDeviceService.setDeviceFwPropertiesWithMetadata(device.macAddress, { userId }, fwProperties);
    }

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.DEVICE,
      EntityActivityAction.UPDATED,
      {
        ...updatedDevice,
        ...(deviceUpdate.valve && { valve: deviceUpdate.valve })
      }
    );

    return updatedDevice;
  }

  public async removeDevice(id: string, resourceEventInfo: ResourceEventInfo): Promise<void> {
    await pipe(
      await this.getDeviceById(id, DeviceService.ALL_DEVICE_DETAILS),
      O.fold(
        async () => {
          await this.deviceResolver.remove(id)
        },
        async device => {
          await this.deviceResolver.remove(id);
          await this.entityActivityService.publishEntityActivity(
            EntityActivityType.DEVICE,
            EntityActivityAction.DELETED,
            stripNulls(device, {} as unknown as Device),
            true
          );

          await this.resourceEventService.publishResourceEvent(
            ResourceEventType.DEVICE,
            ResourceEventAction.DELETED,
            device,
            resourceEventInfo
          );
        }
      )
    );
  }

  public async scanQrCode(authToken: string, userId: string, qrData: QrData): Promise<PairingResponse> {
    const pairingData = await this.apiV1PairingService.initPairing(authToken, qrData);
    const { deviceId } = pairingData;

    await this.markPairInit(pairingData.deviceId);
    await this.internalDeviceService.upsertDevice(deviceId, {});

    const { token } = await this.sessionServiceFactory().issueFirestoreToken(userId, { devices: [deviceId] });

    return {
      ...pairingData,
      firestore: {
        token
      }
     };
  }

  public async pairDevice(authToken: string, deviceCreate: DeviceCreate & { id?: string }, resourceEventInfo: ResourceEventInfo): Promise<Device> {
    const [device, locationOpt] = await Promise.all([
      this.deviceResolver.getByMacAddress(deviceCreate.macAddress, {
        $select: {
          macAddress: true,
          isPaired: true
        }
      }),
      this.locationServiceFactory().getLocation(deviceCreate.location.id, {
        $select: { 
          id: true, 
          address: true,
          address2: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          timezone: true, 
          class: true,
          account: { 
            $select: { 
              id: true, 
              type: true 
            } 
          } 
        }
      })
    ]);

    const location = locationOpt && O.toUndefined(locationOpt);

    if (device !== null && !_.isEmpty(device) && device.isPaired) {
      throw new ConflictError('Device already paired.');
    } else if (!location) {
      throw new ResourceDoesNotExistError('Location does not exist');
    } else if (location.class.key !== 'unit') {
      throw new ConflictError('Devices should only be paired to locations with location class unit');
    }

    if (deviceCreate.deviceType !== DeviceType.PUCK) { 
      const pairInit = await this.pairInitTable.get({ mac_address: deviceCreate.macAddress, account_id: location.account.id });

      // TODO: Define error types
      if (!pairInit) {
        throw new ResourceDoesNotExistError('Pairing uninitialized.');
      } else if (moment().diff(pairInit.created_at, 'seconds') > this.pairInitTTL) {
        throw new ConflictError('Pairing expired.');
      }

    }

    const createdDevice = (device !== null && !_.isEmpty(device)) ?
      device :
      await this.deviceResolver.createDevice(deviceCreate, true);

    if (deviceCreate.deviceType !== DeviceType.PUCK) {
      try {
        await this.apiV1PairingService.completePairing(authToken, createdDevice.id, {
          macAddress: createdDevice.macAddress,
          timezone: location.timezone
        });
      } catch (err) {
        // Failure to complete the pairing process should not cause the pairing to completely fail.
        // This is how pairing works in API v1.
        this.logger.error({ err });
      }
    }

    await this.internalDeviceService.upsertDevice(createdDevice.macAddress, deviceCreate);
    await this.internalDeviceService.syncDevice(createdDevice.macAddress);
    const extendedDeviceInfo: Device | null = await this.deviceResolver.getByMacAddress(createdDevice.macAddress, DeviceService.ALL_DEVICE_DETAILS);

    const payload: Device =  {
      ...createdDevice,
      ...extendedDeviceInfo,
      location,
      connectivity: {...extendedDeviceInfo?.connectivity, ...deviceCreate.connectivity} // LTE will eventually be associated by the LteService later
    };

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.DEVICE,
      EntityActivityAction.CREATED,
      stripNulls(payload, {} as unknown as Device),
      true
    );

    await this.resourceEventService.publishResourceEvent(
      ResourceEventType.DEVICE,
      ResourceEventAction.CREATED,
      createdDevice,
      resourceEventInfo
    );

    return createdDevice;
  }

  public async getAllByLocationId(locationId: string, expand?: PropExpand): Promise<Device[]> {
    return this.deviceResolver.getAllByLocationId(locationId, expand);
  }

  public async getStatsForUser(userId: string): Promise<DeviceStats> {
    const getPaginatedStats = async (page: number = 1, processed: number = 0): Promise<DeviceStats[]> => {
      const locationPage = await this.locationServiceFactory().getByUserIdWithChildren(userId, { 
        $select: { id: true },
      }, undefined, page, { locClass: ['unit'] });
      
      const devices = _.flatten(
        await Promise.all(locationPage.items.map(async l => 
          this.getAllByLocationId(l.id, { 
            $select: { id: true, macAddress: true }
          })
        ))
      );
      
      const deviceMacAddresses = devices.map(d => d.macAddress);
      const internalDevices = !_.isEmpty(deviceMacAddresses) ? 
        await this.internalDeviceService.getDevices(deviceMacAddresses) :
        [];
      const onlineMacAddresses = new Set(
        _.flatMap(internalDevices, (d => d.isConnected ? [d.deviceId] : []))
      );
      const onlineDeviceIds = _.flatMap(devices, d => onlineMacAddresses.has(d.macAddress) ? [d.id] : []);

      const stats = await this.notificationService.retrieveStatisticsInBatch({
        deviceIds: onlineDeviceIds
      });

      const hasMore = locationPage.total > processed + locationPage.items.length;

      return [ 
        {
          total: devices.length,
          offline: {
            total: devices.length - onlineDeviceIds.length
          },
          online: {
            total: onlineDeviceIds.length,
            alerts: {
              info: stats.pending.info,
              warning: stats.pending.warning,
              critical: stats.pending.critical
            }
          }
        },
        ...(hasMore ? await getPaginatedStats(locationPage.page + 1, processed + locationPage.items.length) : [])
      ]
    }

    const deviceStatsArray = await getPaginatedStats();
    
    return _.reduce(deviceStatsArray, (acc, item) => ({
      total: acc.total + item.total,
      offline: {
        total: acc.offline.total + item.offline.total
      },
      online: {
        total: acc.online.total + item.online.total,
        alerts: {
          info: this.sumDeviceAlertStats(acc.online.alerts.info, item.online.alerts.info),
          warning: this.sumDeviceAlertStats(acc.online.alerts.warning, item.online.alerts.warning),
          critical: this.sumDeviceAlertStats(acc.online.alerts.critical, item.online.alerts.critical)
        }
      }
    }), this.emptyDeviceStats());
  }

  public async transferDevice(id: string, destLocationId: string, resourceEventInfo: ResourceEventInfo): Promise<Device> {
    return this.deviceResolver.transferDevice(id, destLocationId, resourceEventInfo);
  }

  public async markPairInit(macAddress: string): Promise<void> {
    const currentUserId = (this.httpContext.request as Request)?.token?.user_id;

    if (!currentUserId) {
      return;
    }

    const accountId = pipe(
      await this.userServiceFactory().getUserById(currentUserId), 
      O.fold(
        () => undefined, 
        user => user.account.id
      )
    );

    if (!accountId) {
      return;
    }

    await this.pairInitTable.put({
      account_id: accountId,
      mac_address: macAddress,
      user_id: currentUserId,
      created_at: new Date().toISOString(),
      _ttl: this.pairInitTTL * 4
    });
  }

  private sumDeviceAlertStats(s1: DeviceAlertStats, s2: DeviceAlertStats): DeviceAlertStats {
    return {
      count: s1.count + s2.count,
      devices: {
        count: s1.devices.count + s2.devices.count,
        absolute: s1.devices.absolute + s2.devices.absolute
      }
    };
  }

  private emptyDeviceStats(): DeviceStats {
    return {
      total: 0,
      offline: {
        total: 0
      },
      online: {
        total: 0,
        alerts: {
          info: this.emptyDeviceAlertStats(),
          warning: this.emptyDeviceAlertStats(),
          critical: this.emptyDeviceAlertStats()
        }
      }
    };
  }

  private emptyDeviceAlertStats(): DeviceAlertStats {
    return {
      count: 0,
      devices: {
        count: 0,
        absolute: 0
      }
    };
  }
}

export { DeviceService };
