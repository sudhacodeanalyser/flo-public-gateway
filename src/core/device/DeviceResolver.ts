import Logger from 'bunyan';
import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { InternalDeviceService } from "../../internal-device-service/InternalDeviceService";
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceModelType, DeviceSystemModeNumeric, DeviceType, DeviceUpdate, PropExpand, SystemMode, ValveState, ValveStateNumeric, AdditionalDevicePropsCodec, PairingDataCodec } from '../api';
import { translateNumericToStringEnum } from '../api/enumUtils';
import DeviceTable from '../device/DeviceTable';
import { NotificationService, NotificationServiceFactory } from '../notification/NotificationService';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import { DeviceRecord, DeviceRecordData } from './DeviceRecord';
import { IrrigationScheduleService, IrrigationScheduleServiceFactory } from './IrrigationScheduleService';
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
            Either.fold(() => null, result => result)
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
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return additionalProperties && (additionalProperties.connectivity || null);

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
            _.get(additionalProperties, 'fwProperties.system_mode')
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
            _.get(additionalProperties, 'fwProperties.valve_state')
          )
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
      const maybeOnboardingLog = await this.onboardingLogTable.getOutOfForcedSleepEvent(device.id);

      return pipe(
        maybeOnboardingLog,
        Option.map(({ created_at }) => ({
          outOfLearningDate: created_at
        })),
        Option.toNullable
      );
    },
    notifications: async (device: Device, shouldExpand = false) => {

      if (!this.notificationService) {
        return null;
      }

      return this.notificationService.retrieveStatistics(`deviceId=${device.id}`);
    },
    healthTest: async (device: Device, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      const latest = await this.healthTestService.getLatest(device.macAddress);
      return (!latest) ? null : { latest };
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

        const pairingData = await this.pairingService.retrievePairingData(authToken, device.id);

        return pipe(
          pairingData,
          Option.chain(result => pipe(
            t.exact(PairingDataCodec).decode(result),
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

        return (additionalProperties && additionalProperties.fwProperties && additionalProperties.fwProperties.serial_number) || null
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
    }
  };
  private locationResolverFactory: () => LocationResolver;
  private irrigationScheduleService: IrrigationScheduleService;
  private notificationService: NotificationService;
  private healthTestService: HealthTestService;

  constructor(
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
   @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
   @inject('DeviceForcedSystemModeTable') private deviceForcedSystemModeTable: DeviceForcedSystemModeTable,
   @inject('OnboardingLogTable') private onboardingLogTable: OnboardingLogTable,
   @inject('Logger') private readonly logger: Logger,
   @inject('IrrigationScheduleServiceFactory') irrigationScheduleServiceFactory: IrrigationScheduleServiceFactory,
   @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
   @inject('PairingService') private pairingService: PairingService,
   @inject('HealthTestServiceFactory') healthTestServiceFactory: HealthTestServiceFactory,
   @inject('LocationTable') private locationTable: LocationTable,
   @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');

    if (!_.isEmpty(this.httpContext) && this.httpContext.request.get('Authorization')) {
      this.irrigationScheduleService = irrigationScheduleServiceFactory.create(this.httpContext.request);
      this.notificationService = notificationServiceFactory.create(this.httpContext.request);
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
    const deviceRecordData = await this.deviceTable.getByMacAddress(macAddress);

    if (deviceRecordData === null) {
      return null;
    }

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

    const updatedDeviceRecordData = await this.deviceTable.update({ id }, patch);

    if (updatedDeviceRecordData === null) {
      throw new ResourceDoesNotExistError();
    }

    return this.toModel(updatedDeviceRecordData);
  }

  public async remove(id: string): Promise<void> {
    return this.deviceTable.remove({ id });
  }

  public async createDevice(deviceCreate: DeviceCreate & { id?: string }, isPaired: boolean = false): Promise<Device> {
    const device = {
      deviceType: DeviceType.FLO_DEVICE_V2,
      deviceModel: DeviceModelType.FLO_0_75,
      id: uuid.v4(),
      ...deviceCreate,
      additionalProps: null,
      isPaired,
      systemMode: {
        isLocked: false,
        shouldInherit: true
      },
      installStatus: {
        isInstalled: false
      }
    };
    const deviceRecordData = DeviceRecord.fromModel(device);
    const createdDeviceRecordData = await this.deviceTable.put(deviceRecordData);

    return this.toModel(createdDeviceRecordData);
  }

  protected async resolveProp<K extends keyof Device>(model: Device, prop: K, shouldExpand: boolean = false, expandProps?: PropExpand): Promise<{ [prop: string]: Device[K] }> {
    // Don't resolve these properties for the Puck
    const puckExcludedProps = [
      'valve',
      'irrigationSchedule',
      'installStatus',
      'learning',
      'healthTest',
      'hardwareThresholds',
      'pairingData',
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
