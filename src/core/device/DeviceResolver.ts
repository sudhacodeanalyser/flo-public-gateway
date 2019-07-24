import Logger from 'bunyan';
import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import uuid from 'uuid';
import { fromPartialRecord } from '../../database/Patch';
import { InternalDeviceService } from "../../internal-device-service/InternalDeviceService";
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceModelType, DeviceSystemModeNumeric, DeviceType, DeviceUpdate, PropExpand, SystemMode, ValveState, ValveStateNumeric, AdditionalDevicePropsCodec } from '../api';
import { translateNumericToStringEnum } from '../api/enumUtils';
import DeviceTable from '../device/DeviceTable';
import { NotificationService, NotificationServiceFactory } from '../notification/NotificationService';
import { LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import DeviceForcedSystemModeTable from './DeviceForcedSystemModeTable';
import { DeviceRecord, DeviceRecordData } from './DeviceRecord';
import { IrrigationScheduleService, IrrigationScheduleServiceFactory } from './IrrigationScheduleService';
import OnboardingLogTable from './OnboardingLogTable';
import * as Option from 'fp-ts/lib/Option';
import { PairingService } from '../../api-v1/pairing/PairingService';
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import * as Either from 'fp-ts/lib/Either';

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

        return device.connectivity;

      } catch (err) {
        this.logger.error({ err });
        return null;
      }
    },
    telemetry: async (device: Device, shouldExpand = false) => {
      try {
        const additionalProperties = await this.internalDeviceService.getDevice(device.macAddress);

        return device.telemetry;

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
          lastKnown: _.get(additionalProperties, 'valveState.lastKnown') || translateNumericToStringEnum(
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
      const onboardingLog = await this.onboardingLogTable.getCurrentState(device.id);
      return {
        isInstalled: onboardingLog !== null
      }
    },
    notifications: async (device: Device, shouldExpand = false) => {
      return this.notificationService.getAlarmCounts({});
    },
    hardwareThresholds: async (device: Device, shouldExpand = false) => {
      const minZero = {
        okMin: 0,
        minValue: 0
      };

      const gpm = device.deviceType !== 'flo_device_075_v2' ?
        {
          ...minZero,
          okMax: 16,
          maxValue: 20
        } :
        {
          ...minZero,
          okMax: 12,
          maxValue: 16
        };

      const lpm = device.deviceType !== 'flo_device_075_v2' ?
        {
          ...minZero,
          okMax: 60,
          maxValue: 75
        } :
        {
          ...minZero,
          okMax: 45,
          maxValue: 60
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
    },
    pairingData: async (device: Device, shouldExpand = false) => {
      try {
        const authToken = shouldExpand && this.httpContext.request.get('Authorization');

        if (!shouldExpand || !authToken) {
          return null;
        }

        const pairingData = await this.pairingService.retrievePairingData(authToken, device.id);

        if (Option.isNone(pairingData)) {
          return null;
        }

        return {
          apName: pairingData.value.ap_name,
          loginToken: pairingData.value.login_token,
          clientCert: pairingData.value.client_cert,
          clientKey: pairingData.value.client_key,
          serverCert: pairingData.value.server_cert,
          websocketCert: pairingData.value.websocket_cert,
          websocketCertDer: pairingData.value.websocket_cert_der,
          websocketKey: pairingData.value.websocket_key
        };  
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
   @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
   @inject('PairingService') private pairingService: PairingService,
   @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');

    if (!_.isEmpty(this.httpContext)) {
      this.irrigationScheduleService = irrigationScheduleServiceFactory.create(this.httpContext.request);
      this.notificationService = notificationServiceFactory.create(this.httpContext.request);
    }
  }

  public async get(id: string, expandProps: PropExpand = []): Promise<Device | null> {
    const deviceRecordData: DeviceRecordData | null = await this.deviceTable.get({ id });

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getByMacAddress(macAddress: string, expandProps: PropExpand = []): Promise<Device | null> {
    const deviceRecordData = await this.deviceTable.getByMacAddress(macAddress);

    if (deviceRecordData === null) {
      return null;
    }

    return this.toModel(deviceRecordData, expandProps);
  }

  public async getAllByLocationId(locationId: string, expandProps: PropExpand = []): Promise<Device[]> {
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

  private async toModel(deviceRecordData: DeviceRecordData, expandProps: PropExpand = []): Promise<Device> {
    const device = new DeviceRecord(deviceRecordData).toModel();
    const expandedProps = await this.resolveProps(device, expandProps);

    return {
      ...device,
      ...expandedProps
    };
  }
}

export { DeviceResolver };

