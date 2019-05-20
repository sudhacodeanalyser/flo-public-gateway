import _ from 'lodash';
import { injectable, inject } from 'inversify';
import { Device, DeviceUpdate, DeviceCreate, Location } from '../api';
import { DeviceResolver } from '../resolver';
import LocationService from '../location/LocationService';
import { ApiV1PairingService, PairingData, QrData } from '../../api-v1/ApiV1PairingService';
import ConflictError from '../api/error/ConflictError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import Logger from 'bunyan';

@injectable()
class DeviceService {
  constructor(
    @inject('DeviceResolver') private deviceResolver: DeviceResolver,
    @inject('LocationService') private locationService: LocationService,
    @inject('ApiV1PairingService') private apiV1PairingService: ApiV1PairingService,
    @inject('Logger') private readonly logger: Logger
  ) {}

  public async getDeviceById(id: string, expand?: string[]): Promise<Device | {}> {
    const device: Device | null = await this.deviceResolver.get(id, expand);

    return device === null ? {} : device;
  }

  public async updatePartialDevice(id: string, deviceUpdate: DeviceUpdate): Promise<Device> {
    return this.deviceResolver.updatePartial(id, deviceUpdate);
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
      this.locationService.getLocation(deviceCreate.location.id)
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
      this.logger.info({ err });
    }

    return createdDevice;
  }

  private async completePairing(authToken: string, device: Device, timezone: string): Promise<void> {

      return ;
  }
}

export default DeviceService;