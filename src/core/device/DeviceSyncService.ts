import { inject, injectable } from 'inversify';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as _ from 'lodash';
import OnboardingLogTable from './OnboardingLogTable';
import { OnboardingService } from './OnboardingService';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import { Device, DeviceSyncOptions } from '../api';
import Logger from 'bunyan';
import { MachineLearningService } from '../../machine-learning/MachineLearningService';
import { EnterpriseService } from '../../enterprise-service/EnterpriseService';

export type DeviceSyncFn = (device: Device) => Promise<void>;
export type DeviceSyncConfig = { [name: string]: DeviceSyncFn };

@injectable()
class DeviceSyncService {
  constructor(
    @inject('OnboardingLogTable') private onboardingLogTable: OnboardingLogTable,
    @inject('OnboardingService') private onboardingService: OnboardingService,
    @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
    @inject('MachineLearningService') private mlService: MachineLearningService,
    @inject('EnterpriseService') private enterpriseService: EnterpriseService,
    @inject('Logger') private logger: Logger,
  ) {}

  public async synchronize(device: Device, options: DeviceSyncOptions): Promise<void> {
    const syncDefinition: DeviceSyncConfig = {
      syncDevice:             this.syncDevice.bind(this),
      syncInstallEvent:       this.syncInstallEvent.bind(this),
      syncPesSchedule:        this.syncPesSchedule.bind(this),
      syncEnterpriseSettings: this.syncEnterpriseSettings.bind(this),
      syncFloSenseModel:      this.syncFloSenseModel.bind(this),
    }
    const syncOptions = { syncDevice: true, ...options.additional };

    this.logger.info(`DeviceSyncService.synchronize: Starting sync process for device ${device.macAddress}`, syncOptions);
    const syncPromises = _.chain(syncOptions)
      .pickBy(value => value === true)
      .map(async (val, key) => {
        try {
          return syncDefinition[key] ? await syncDefinition[key](device) : {}
        } catch (err) {
          this.logger.warn(`synchronize: There was an error executing sync process: ${key}`, err);
        }
      })
      .value();

    await Promise.all(syncPromises);
    this.logger.info(`DeviceSyncService.synchronize: sync process for device ${device.macAddress} completed`);
  }

  public async syncDevice(device: Device): Promise<void> {
    return this.internalDeviceService.syncDevice(device.macAddress);
  }

  public async syncPesSchedule(device: Device): Promise<void> {
    return this.mlService.syncPesSchedule(device.macAddress);
  }

  public async syncEnterpriseSettings(device: Device): Promise<void> {
    return this.enterpriseService.syncDevice(device.macAddress);
  }

  public async syncFloSenseModel(device: Device): Promise<void> {
    return this.mlService.syncFloSenseModel(device.macAddress);
  }

  public async syncInstallEvent(device: Device): Promise<void> {
    const maybeOnboardingLog = await this.onboardingLogTable.getInstallEvent(device.id);
    const isInstalled = pipe(
      maybeOnboardingLog,
      Option.fold(() => false, () => true)
    );
    if (isInstalled) {
      this.logger.trace(`DeviceSyncService.syncInstallEvent:device ${device.macAddress} is already installed.`);
      return;
    }
    const additionProperties = await this.internalDeviceService.getDevice(device.macAddress);
    if (!additionProperties) {
      this.logger.warn(`DeviceSyncService.syncInstallEvent: device ${device.macAddress} not found in deviceService. Skipping.`);
      return;
    }
    const deviceInstalled = _.get(additionProperties, 'lastKnownFwProperties.device_installed', false);
    if (deviceInstalled) {
      this.logger.trace(`DeviceSyncService.syncInstallEvent: device ${device.macAddress} is installed in fwProperties. Marking as installed in the cloud.`);
      await this.onboardingService.markDeviceInstalled(device.macAddress);
    }
  }
}

export { DeviceSyncService };