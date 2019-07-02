import Logger from 'bunyan';
import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { InternalDeviceService } from "../../internal-device-service/InternalDeviceService";
import { ApiNotificationServiceFactory } from '../../notification/ApiNotificationServiceFactory';
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceModelType, DeviceSystemModeNumeric, DeviceType, DeviceUpdate, SystemMode, ValveState, ValveStateNumeric } from '../api';
import { translateNumericToStringEnum } from '../api/enumUtils';
import DeviceTable from '../device/DeviceTable';
import { NotificationService } from '../notification/NotificationService';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import { DeviceRecord, DeviceRecordData } from './DeviceRecord';
import { IrrigationScheduleService, IrrigationScheduleServiceFactory } from './IrrigationScheduleService';
import OnboardingLogTable from './OnboardingLogTable';

@injectable()
class DeviceResolver extends Resolver<Device> {
  protected propertyResolverMap: PropertyResolverMap<Device> = {
    location: async (device: Device, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      return this.locationResolverFactory().get(device.location.id);
    },
    additionalProps: async (device: Device, shouldExpand = false) => {
      try {
        return this.internalDeviceService.getDevice(device.macAddress);
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

        return {
          ...device.systemMode,
          isLocked: forcedSystemMode !== null && forcedSystemMode.system_mode !== null,
          lastKnown: translateNumericToStringEnum(
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
        const additionalProperts = await this.internalDeviceService.getDevice(device.macAddress);

        return {
          ...device.valve,
          lastKnown: translateNumericToStringEnum(
            ValveState,
            ValveStateNumeric,
            _.get(additionalProperts, 'fwProperties.valve_state')
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
      const onboardingLog = await this.onboardingLogTable.getCurrentState(device.id);
      return {
        isInstalled: onboardingLog !== null
      }
    },
    notifications: async (device: Device, shouldExpand = false) => {
      return this.notificationService.getAlarmCounts({});
    }
  };
  private locationResolverFactory: () => LocationResolver;
  private irrigationScheduleService: IrrigationScheduleService;
  private notificationService: NotificationService;

  constructor(
   @inject('DeviceTable') private deviceTable: DeviceTable,
   @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
   @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
   @inject('DeviceForcedSystemModeTable') private deviceForcedSystemModeTable: DeviceForcedSystemModeTable,
   @inject('OnboardingLogTable') private onboardingLogTable: OnboardingLogTable,
   @inject('Logger') private readonly logger: Logger,
   @inject('IrrigationScheduleServiceFactory') irrigationScheduleServiceFactory: IrrigationScheduleServiceFactory,
   @inject('NotificationServiceFactory') notificationServiceFactory: ApiNotificationServiceFactory,
   @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');

    if (!_.isEmpty(this.httpContext)) {
      this.irrigationScheduleService = irrigationScheduleServiceFactory.create(this.httpContext.request);
      this.notificationService = notificationServiceFactory.create(this.httpContext.request);
    }
  }

  public async get(id: string, expandProps: string[] = []): Promise<Device | null> {
    const deviceRecordData: DeviceRecordData | null = await this.deviceTable.get({ id });

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getByMacAddress(macAddress: string, expandProps: string[] = []): Promise<Device | null> {
    const deviceRecordData = await this.deviceTable.getByMacAddress(macAddress);

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getAllByLocationId(locationId: string, expandProps: string[] = []): Promise<Device[]> {
    const deviceRecordData = await this.deviceTable.getAllByLocationId(locationId);

    return Promise.all(
      deviceRecordData.map(deviceRecordDatum => this.toModel(deviceRecordDatum, expandProps))
    );
  }

  public async updatePartial(id: string, deviceUpdate: DeviceUpdate): Promise<Device> {
    const deviceRecordData = DeviceRecord.fromPartialModel(deviceUpdate);
    const patch = fromPartialRecord<DeviceRecordData>(deviceRecordData);
    const updatedDeviceRecordData = await this.deviceTable.update({ id }, patch);

    return this.toModel(updatedDeviceRecordData);
  }

  public async remove(id: string): Promise<void> {
    return this.deviceTable.remove({ id });
  }

  public async createDevice(deviceCreate: DeviceCreate, isPaired: boolean = false): Promise<Device> {
    const device = {
      ...deviceCreate,
      deviceType: DeviceType.FLO_DEVICE_V2,
      deviceModel: DeviceModelType.FLO_0_75,
      additionalProps: null,
      isPaired,
      id: uuid.v4(),
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

  private async toModel(deviceRecordData: DeviceRecordData, expandProps: string[] = []): Promise<Device> {
    const device = new DeviceRecord(deviceRecordData).toModel();
    const expandedProps = await this.resolveProps(device, expandProps);

    return {
      ...device,
      ...expandedProps
    };
  }
}

export { DeviceResolver };

