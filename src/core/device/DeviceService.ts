import _ from 'lodash';
import { injectable, inject } from 'inversify';
import { DependencyFactoryFactory, Device, DeviceUpdate, DeviceCreate, Location, ValveState } from '../api';
import { DeviceResolver } from '../resolver';
import { LocationService } from '../service';
import { PairingService, PairingData, QrData } from '../../api-v1/pairing/PairingService';
import ConflictError from '../api/error/ConflictError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import Logger from 'bunyan';
import { DirectiveService } from './DirectiveService';

@injectable()
class DeviceService {
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('DeviceResolver') private deviceResolver: DeviceResolver,
    @inject('PairingService') private apiV1PairingService: PairingService,
    @inject('Logger') private readonly logger: Logger,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
  }

  public async getDeviceById(id: string, expand?: string[]): Promise<Device | {}> {
    const device: Device | null = await this.deviceResolver.get(id, expand);

    return device === null ? {} : device;
  }

  public async getByMacAddress(macAddress: string, expand?: string[]): Promise<Device | null> {
    return this.deviceResolver.getByMacAddress(macAddress, expand);
  }

  public async updatePartialDevice(id: string, deviceUpdate: DeviceUpdate, directiveService?: DirectiveService): Promise<Device> {
    const updatedDevice = await this.deviceResolver.updatePartial(id, deviceUpdate);

    if (directiveService && deviceUpdate.valve && deviceUpdate.valve.target === ValveState.OPEN) {
      await directiveService.openValve(id);
    } else if (directiveService && deviceUpdate.valve && deviceUpdate.valve.target === ValveState.CLOSED) {
      await directiveService.closeValve(id);
    }

    return updatedDevice;
  }

  public async removeDevice(id: string): Promise<void> {
    return this.deviceResolver.remove(id);
  }

  public async scanQrCode(authToken: string, qrData: QrData): Promise<PairingData> {
    
    return this.apiV1PairingService.initPairing(authToken, qrData);
  }

  public async pairDevice(authToken: string, deviceCreate: DeviceCreate): Promise<Device> {
    const [device, location] = await Promise.all([
      this.deviceResolver.getByMacAddress(deviceCreate.macAddress),
      this.locationServiceFactory().getLocation(deviceCreate.location.id)
    ]);

    if (device !== null && !_.isEmpty(device) && !device.isPaired) {
      throw new ConflictError('Device already paired.');
    } else if (_.isEmpty(location)) {
      throw new ResourceDoesNotExistError('Location does not exist');
    }

    const createdDevice = (device !== null && !_.isEmpty(device)) ? 
      device : 
      await this.deviceResolver.createDevice(deviceCreate, true);

    try {
      await this.apiV1PairingService.completePairing(authToken, createdDevice.id, { 
        macAddress: createdDevice.macAddress, 
        timezone: (location as Location).timezone 
      });
    } catch (err) {
      // Failure to complete the pairing process should not cause the pairing to completely fail.
      // This is how pairing works in API v1.
      this.logger.error({ err });
    }

    return createdDevice;
  }

  public async getAllByLocationId(locationId: string, expand?: string[]): Promise<Device[]> {
    return this.deviceResolver.getAllByLocationId(locationId, expand);
  }
}

export { DeviceService };