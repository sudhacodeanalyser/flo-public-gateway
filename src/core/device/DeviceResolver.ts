import Logger from 'bunyan';
import { inject, injectable } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import { injectableHttpContext } from '../../cache/InjectableHttpContextUtils';
import * as _ from 'lodash';
import * as uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { InternalDeviceService } from "../../internal-device-service/InternalDeviceService";
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceModelType, DevicePairingDataCodec, DeviceSystemModeNumeric, DeviceType, DeviceUpdate, PropExpand, SystemMode, ValveState, ValveStateNumeric, AdditionalDevicePropsCodec, PuckPairingDataCodec, PairingData } from '../api';
import { translateNumericToStringEnum } from '../api/enumUtils';
import DeviceTable from '../device/DeviceTable';
import { NotificationService } from '../notification/NotificationService';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import { DeviceRecord, DeviceRecordData } from './DeviceRecord';
import { IrrigationScheduleService } from './IrrigationScheduleService';
import OnboardingLogTable from './OnboardingLogTable';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { PairingService } from '../../api-v1/pairing/PairingService';
import * as t from 'io-ts';
import * as Either from 'fp-ts/lib/Either';
import { HealthTestServiceFactory, HealthTestService } from './HealthTestService';
import LocationTable from '../location/LocationTable';
import { NonEmptyStringFactory } from '../api/validator/NonEmptyString';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { MachineLearningService } from '../../machine-learning/MachineLearningService';
import { PuckTokenService } from './PuckTokenService';
import ConflictError from '../api/error/ConflictError';
import moment from 'moment-timezone';
import LteTable from './LteTable';
import { ResourceEventAction, ResourceEventInfo, ResourceEventType } from '../api/model/ResourceEvent';
import { ResourceEventService } from '../service';

const defaultHwThresholds = (deviceModel: string) => {
  const minZero = {
    okMin: 0,
    minValue: 0
  };

  const gpm = deviceModel !== 'flo_device_075_v2' ?
    {
      ...minZero,
      okMax: 100,
      maxValue: 125
    } :
    {
      ...minZero,
      okMax: 29,
      maxValue: 35
    };

  const lpm = deviceModel !== 'flo_device_075_v2' ?
    {
      ...minZero,
      okMax: 378,
      maxValue: 470
    } :
    {
      ...minZero,
      okMax: 110,
      maxValue: 130
    };

  const psi = {
    okMin: 30,
    okMax: 80,
    minValue: 0,
    maxValue: 100
  };

  const kPa = {
    okMin: 210,
    okMax: 550,
    minValue: 0,
    maxValue: 700
  };

  const tempF = {
    okMin: 50,
    okMax: 80,
    minValue: 0,
    maxValue: 100
  };

  const tempC = {
    okMin: 10,
    okMax: 30,
    minValue: 0,
    maxValue: 40
  };

  return {
    gpm,
    lpm,
    psi,
    kPa,
    temp: tempF,
    tempF,
    tempC
  };
}

@injectable()
class DeviceResolver extends Resolver<Device> {

  protected propertyResolverMap: PropertyResolverMap<Device> = {
    location: async (device: Device, shouldExpand = false, expandProps?: PropExpand) => {
      if (!shouldExpand) {
        return null;
      }

      return this.locationResolverFactory().get(device.location.id, expandProps);
    },
    additionalProps: async (device: Device, shouldExpand = false) => {
      try {
        const additionalProps = await this.internalDeviceService.getDevice(device.macAddress);

        if (additionalProps) {
          // Strip properties not exposed to on Device model
          return pipe(
            t.exact(AdditionalDevicePropsCodec).decode(additionalProps),
            Either.fold(() => null, result => ({
              ...result,
              fwProperties: additionalProps.lastKnownFwProperties
            }))
          );
        }

        return null;

      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    connectivity: async (device: Device, shouldExpand = false) => {
      try {
        const maybeAdditionalProperties = await this.internalDeviceService.getDevice(device.macAddress);
        const maybeLte = await this.lteTable.getByDeviceId(device.id);

        const lte = pipe(
          maybeLte,
          Option.map(({ qrCode, imei, iccid }) => ({ 
            lte: { 
              qrCode,
              imei, 
              iccid
             }
          })),
          Option.toNullable
        );
        
        const additionalProperties = maybeAdditionalProperties && (maybeAdditionalProperties.connectivity || null);
        
        if (!additionalProperties && !lte) {
          return null;
        }

        return {
          ...additionalProperties,
          ...lte
        };

      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    telemetry: async (device: Device, shouldExpand = false) => {
      try {
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return additionalProperties && (additionalProperties.telemetry || null);
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    systemMode: async (device: Device, shouldExpand = false) => {
      try {
        const [
          forcedSystemMode,
          additionalProperties
        ] = await Promise.all([
          this.deviceForcedSystemModeTable.getLatest(device.id),
          this.internalDeviceService.getDevice(device.macAddress)
        ]);

        const {
          target,
          revertScheduledAt,
          revertMode,
          revertMinutes,
          ...systemModeData
        } = device.systemMode || {
          target: undefined,
          revertScheduledAt: undefined,
          revertMode: undefined,
          revertMinutes: undefined
        };

        const revertData = target !== SystemMode.SLEEP ?
          {} :
          {
            revertScheduledAt,
            revertMode,
            revertMinutes
          };

        return {
          ...systemModeData,
          ...revertData,
          target,
          isLocked: forcedSystemMode !== null && forcedSystemMode.system_mode !== null,
          lastKnown: _.get(additionalProperties, 'systemMode.lastKnown') || translateNumericToStringEnum(
            SystemMode,
            DeviceSystemModeNumeric,
            _.get(additionalProperties, 'lastKnownFwProperties.system_mode')
          )
        };
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    valve: async (device: Device, shouldExpand = false) => {
      try {
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return {
          ...device.valve,
          lastKnown: _.get(additionalProperties, 'valve.lastKnown') || translateNumericToStringEnum(
            ValveState,
            ValveStateNumeric,
            _.get(additionalProperties, 'lastKnownFwProperties.valve_state')
          ),
          ...(additionalProperties && additionalProperties.valveStateMeta && { meta: additionalProperties.valveStateMeta })
        };
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    irrigationSchedule: async (device: Device, shouldExpand = false) => {
      try {
        if (!shouldExpand || _.isEmpty(this.irrigationScheduleService)) {
          return null;
        }

        const [
          computedIrrigationSchedule,
          irrigationAllowedState
        ] = await Promise.all([
          this.irrigationScheduleService.getDeviceComputedIrrigationSchedule(device.id),
          this.irrigationScheduleService.getDeviceIrrigationAllowedState(device.id)
        ]);
        const { macAddress, ...computed } = computedIrrigationSchedule;

        return {
          computed,
          isEnabled: irrigationAllowedState.isEnabled || false,
          updatedAt: irrigationAllowedState.updatedAt
        };
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    installStatus: async (device: Device, shouldExpand = false) => {
      const maybeOnboardingLog = await this.onboardingLogTable.getInstallEvent(device.id);

      return {
        isInstalled: pipe(
          maybeOnboardingLog,
          Option.fold(() => false, () => true)
        ),
        installDate: pipe(
          maybeOnboardingLog,
          Option.map(({ created_at }) => created_at),
          Option.toUndefined
        )
      };
    },
    learning: async (device: Device, shouldExpand = false) => {
      try {
        const maybeOnboardingLog = await this.onboardingLogTable.getOutOfForcedSleepEvent(device.id);

        const mlData = await this.mlService.getLearning(device.macAddress);

        return {
          outOfLearningDate: pipe(
            maybeOnboardingLog,
            Option.map(({ created_at }) => created_at),
            Option.toUndefined
          ),
          enabled: mlData.enabled || pipe(maybeOnboardingLog, Option.isNone),
          expiresOnOrAfter: mlData.expiresOnOrAfter,
        }
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    notifications: async (device: Device, shouldExpand = false) => {

      if (!this.notificationService) {
        return null;
      }


      return this.notificationService.retrieveStatistics(`deviceId=${device.id}`);
    },
    healthTest: async (device: Device, shouldExpand = false) => {
      const latest = shouldExpand ?
        (await this.healthTestService.getLatest(device.macAddress)) : 
        undefined;
      const healthTest = {
        ...(latest && ({ latest }))
      };
      const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

      if (additionalProperties && additionalProperties.fwProperties) {
        const location = await this.locationResolverFactory().get(device.location.id, {
          $select: {
            timezone: true
          }
        });

        const timezone = location?.timezone || 'Etc/UTC';
        const start = additionalProperties.fwProperties.ht_scheduler_start &&
          moment
            .tz(
              additionalProperties.fwProperties.ht_scheduler_start,
              'HH:mm',
              'Etc/UTC'
            )
            .tz(timezone)
            .format('HH:mm');
        const end = additionalProperties.fwProperties.ht_scheduler_end &&
            moment
              .tz(
                additionalProperties.fwProperties.ht_scheduler_end,
                'HH:mm',
                'Etc/UTC'
              )
              .tz(timezone)
              .format('HH:mm');
        const timesPerDay = additionalProperties.fwProperties.ht_times_per_day
        const isEnabled = timesPerDay > 0;
        const config = {
          enabled: isEnabled,
          timesPerDay,
          start,
          end
        };

        return {
          ...healthTest,
          config
        };
      }

      return healthTest;
    },
    hardwareThresholds: async (device: Device, shouldExpand = false) => {
      const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);
      return (additionalProperties && additionalProperties.hwThresholds) || defaultHwThresholds(device.deviceModel);
    },
    pairingData: async (device: Device, shouldExpand = false) => {
      try {
        const authToken = shouldExpand && this.httpContext.request.get('Authorization');

        if (!shouldExpand || !authToken) {
          return null;
        }

        const isPuck = device.deviceType === DeviceType.PUCK;
        const pairingData: Option.Option<PairingData> = isPuck ?
          await this.puckTokenService.retrievePairingData(device.id) :
          await this.pairingService.retrievePairingData(authToken, device.id);

        return pipe(
          pairingData,
          Option.chain(result => pipe(
            t.exact(isPuck ? PuckPairingDataCodec : DevicePairingDataCodec).decode(result),
            Either.fold(
              () => Option.none,
              data => Option.some(data)
            )
          )),
          Option.toNullable
        );
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    serialNumber: async (device: Device, shouldExpand = false) => {
      try {
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return (additionalProperties && additionalProperties.fwProperties && additionalProperties.fwProperties.serial_number) || null;
        
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    battery: async (device: Device, shouldExpand = false) => {
      if (device.deviceType !== DeviceType.PUCK) {
        return null;
      }

      try {
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);
        const batteryLevel = (additionalProperties && additionalProperties.fwProperties && additionalProperties.fwProperties.telemetry_battery_percent) || 0;
        const updatedTime = (additionalProperties && additionalProperties.lastHeardFromTime) || undefined;
        return {
          level: batteryLevel,
          updated: updatedTime
        };
      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    irrigationType: async (device: Device, shouldExpand = false) => {

      if (device.irrigationType) {
        return device.irrigationType;
      }

      const otherDevices = (await this.deviceTable.getAllByLocationId(device.location.id))
        .filter(deviceRecord => deviceRecord.id !== device.id)
        .map(deviceRecord => new DeviceRecord(deviceRecord).toModel());

      // If there's at least one other device with irrigation or an undecided status, then it's undecidable
      if (
        otherDevices.length &&
        otherDevices.some(otherDevice =>
          otherDevice.irrigationType !== 'none' || otherDevice.irrigationType !== 'not_plumbed'
        )
      ) {
        return NonEmptyStringFactory.create('not_sure');
      }

      const locationRecord = await this.locationTable.getByLocationId(device.location.id);

      if (!locationRecord) {
        return NonEmptyStringFactory.create('not_sure');
      }

      const hasSprinklers = (locationRecord.outdoor_amenities || []).some(amenity => amenity.toLowerCase() === 'sprinklers');
      const isIrrigationOnly = (locationRecord.location_type || '').toLowerCase() === 'irrigation';

      if (hasSprinklers || isIrrigationOnly) {
        return NonEmptyStringFactory.create('sprinklers');
      } else {
        return NonEmptyStringFactory.create('not_sure');
      }
    },
    shutoff: async (device: Device, shouldExpand = false) => {
      const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);
      const shutoffTimeSeconds = Math.max(
        _.get(additionalProperties, 'fwProperties.alarm_shutoff_time_epoch_sec', 0),
        0
      );

      return {
        scheduledAt: new Date(shutoffTimeSeconds * 1000).toISOString()
      };
    },
    actionRules: async (device: Device, shouldExpand = false) => {
      const actionRulesResponse = await this.internalDeviceService.getActionRules(device.id);
      return (actionRulesResponse && actionRulesResponse.actionRules) || null;
    },
    pes: async (device: Device, shouldExpand = false) => {
      try {

        if (!shouldExpand) {
          return null;
        }

        const mlData = await this.mlService.get(device.macAddress);

        return mlData.pes;
      } catch (err) {

        if (this.logger) {
          this.logger.error({ err });
        }

        return null;
      }
    },
    floSense: async (device: Device, shouldExpand = false) => {
      try {

        if (!shouldExpand) {
          return null;
        }

        const mlData = await this.mlService.get(device.macAddress);

        return mlData.floSense;
      } catch (err) {

       if (this.logger) {
          this.logger.error({ err });
        }

        return null;
      }
    },
    audio: async (device: Device, shouldExpand = false) => {

      if (device.deviceType !== DeviceType.PUCK) {
        return null;
      }

      try {
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return additionalProperties && additionalProperties.audio;
      } catch (err) {
        if (this.logger) {
          this.logger.error({ err });
        }

        return null;
      }
    },
    firmware: async (device: Device, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      try {
        const additionProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return additionProperties && {
          current: {
            version: additionProperties.fwVersion
          },
          latest: additionProperties.latestFwInfo || {
            version: '',
            sourceType: '',
            sourceLocation: ''
          }
        };
      } catch (err) {
        if (this.logger) {
          this.logger.error({ err });

          return null;
        }
      }
    },
    nickname: async (device: Device, shouldExpand = false) => {
      
      if (device.nickname) {
        return device.nickname;
      } else if (device.deviceType === DeviceType.PUCK) {
        return 'Smart Water Detector';
      } else {
        return 'Smart Water Shutoff';
      }
    },
    componentHealth: async (device: Device, shouldExpand = false) => {
      const additionalProps = await this.internalDeviceService.getDevice(device.macAddress);

      return additionalProps && additionalProps.componentHealth ?
        additionalProps.componentHealth :
        null;
    }
  };

  private locationResolverFactory: () => LocationResolver;
  private healthTestService: HealthTestService;

  constructor(
   @injectableHttpContext private readonly httpContext: interfaces.HttpContext,
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
   @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
   @inject('DeviceForcedSystemModeTable') private deviceForcedSystemModeTable: DeviceForcedSystemModeTable,
   @inject('OnboardingLogTable') private onboardingLogTable: OnboardingLogTable,
   @inject('Logger') private readonly logger: Logger,
   @inject('NotificationService') private notificationService: NotificationService,
   @inject('PairingService') private pairingService: PairingService,
   @inject('HealthTestServiceFactory') healthTestServiceFactory: HealthTestServiceFactory,
   @inject('LocationTable') private locationTable: LocationTable,
   @inject('MachineLearningService') private mlService: MachineLearningService,
   @inject('PuckTokenService') private puckTokenService: PuckTokenService,
   @inject('LteTable') private lteTable: LteTable,
   @inject('IrrigationScheduleService') private irrigationScheduleService: IrrigationScheduleService,
   @inject('ResourceEventService') private resourceEventService: ResourceEventService,
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');

    if (!_.isEmpty(this.httpContext) && this.httpContext.request.get('Authorization')) {
      this.healthTestService = healthTestServiceFactory.create(this.httpContext.request);
    }
  }

  public async get(id: string, expandProps?: PropExpand): Promise<Device | null> {
    const deviceRecordData: DeviceRecordData | null = await this.deviceTable.get({ id });

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getByMacAddress(macAddress: string, expandProps?: PropExpand): Promise<Device | null> {
    this.logger.trace({method: 'DeviceResolver.getByMacAddress', action:'get', macAddress, expandProps });
    const deviceRecordData = await this.deviceTable.getByMacAddress(macAddress);
    this.logger.trace({method: 'DeviceResolver.getByMacAddress', action:'get-result', deviceRecordData });
    
    if (deviceRecordData === null) {
      return null;
    }
    
    this.logger.trace({method: 'DeviceResolver.toModel', action:'begin' });
    return this.toModel(deviceRecordData, expandProps);
  }

  public async getAllByLocationId(locationId: string, expandProps?: PropExpand): Promise<Device[]> {
    const deviceRecordData = await this.deviceTable.getAllByLocationId(locationId);

    return Promise.all(
      deviceRecordData.map(deviceRecordDatum => this.toModel(deviceRecordDatum, expandProps))
    );
  }

  public async updatePartial(id: string, deviceUpdate: DeviceUpdate): Promise<Device> {
    const deviceRecordData = DeviceRecord.fromPartialModel(deviceUpdate);
    const patch = fromPartialRecord<DeviceRecordData>(deviceRecordData, ['puck_configured_at']);

    if (_.isEmpty(patch) || (_.isEmpty(patch.setOps) && _.isEmpty(patch.appendOps) && _.isEmpty(patch.removeOps))) {
      const device = await this.get(id);

      if (!device) {
        throw new ConflictError('Device does not exist.');
      }

      return device;
    } else {
      const updatedDeviceRecordData = await this.deviceTable.update({ id }, patch);


      return this.toModel(updatedDeviceRecordData);
    }

  }

  public async remove(id: string): Promise<void> {
    return this.deviceTable.remove({ id });
  }

  public async createDevice(deviceCreate: DeviceCreate & { id?: string }, isPaired: boolean = false): Promise<Device> {
    const device = {
      // @ts-ignore: 2783
      deviceType: DeviceType.FLO_DEVICE_V2,
      // @ts-ignore: 2783
      deviceModel: DeviceModelType.FLO_0_75,
      id: uuid.v4(),
      additionalProps: null,
      isPaired,
      systemMode: {
        isLocked: false,
        shouldInherit: true
      },
      installStatus: {
        isInstalled: false
      },
      ...deviceCreate
    };
    const deviceRecordData = DeviceRecord.fromModel(device);
    const createdDeviceRecordData = await this.deviceTable.put(deviceRecordData);

    return this.toModel(createdDeviceRecordData);
  }

  public async transferDevice(deviceId: string, destLocationId: string, resourceEventInfo: ResourceEventInfo): Promise<Device> {
    const deviceRecord = await this.deviceTable.get({ id: deviceId });

    if (!deviceRecord) {
      throw new ResourceDoesNotExistError('Device not found.');
    }

    const sourceLocationRecord = await this.locationTable.getByLocationId(deviceRecord.location_id);

    if (!sourceLocationRecord) {
        throw new ResourceDoesNotExistError('Location does not exist');
    }

    const destLocationRecord = await this.locationTable.getByLocationId(destLocationId);

    if (!destLocationRecord) {
        throw new ResourceDoesNotExistError('Location does not exist');
    }

    await this.deviceTable.remove({ id: deviceId });

    const transferredDeviceRecord = await this.deviceTable.put({
      ...deviceRecord,
      location_id: destLocationId
    });
    
    await this.notificationService.moveEvents(
          sourceLocationRecord.account_id, 
          destLocationRecord.account_id, 
          sourceLocationRecord.location_id, 
          destLocationId,
          deviceId);

    const transferredDevice = await this.toModel(transferredDeviceRecord);

    resourceEventInfo.eventData = {
      sourceLocationId: sourceLocationRecord.location_id,
      sourceLocationName: sourceLocationRecord.location_name,
      destLocationId: destLocationRecord.location_id,
      destLocationName: destLocationRecord.location_name
    };

    await this.resourceEventService.publishResourceEvent(
      ResourceEventType.DEVICE,
      ResourceEventAction.UPDATED,
      transferredDevice,
      resourceEventInfo
    );
    
    return transferredDevice;
  }


  protected async resolveProp<K extends keyof Device>(model: Device, prop: K, shouldExpand: boolean = false, expandProps?: PropExpand): Promise<{ [prop: string]: Device[K] }> {
    // Don't resolve these properties for the Puck
    const puckExcludedProps = [
      'valve',
      'irrigationSchedule',
      'installStatus',
      'learning',
      'healthTest',
      'irrigationType',
      'irrigationSchedule',
      'systemMode'
    ];

    if (model.deviceType === DeviceType.PUCK && puckExcludedProps.indexOf(prop) >= 0) {
      return {};
    } else {
      return super.resolveProp<K>(model, prop, shouldExpand, expandProps);
    }
  }

private async toModel(deviceRecordData: DeviceRecordData, expandProps?: PropExpand): Promise<Device> {
    const device = new DeviceRecord(deviceRecordData).toModel();
    const expandedProps = await this.resolveProps(device, expandProps);

    return {
      ...device,
      ...expandedProps
    };
  }
}

export { DeviceResolver };
