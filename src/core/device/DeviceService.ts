import Logger from 'bunyan';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import moment from 'moment';
import { PairingService, QrData } from '../../api-v1/pairing/PairingService';
import { InternalDeviceService } from '../../internal-device-service/InternalDeviceService';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { DependencyFactoryFactory, Device, DeviceCreate, DeviceType, DeviceUpdate, PropExpand, Telemetry, ValveState } from '../api';
import ConflictError from '../api/error/ConflictError';
import NotFoundError from '../api/error/NotFoundError';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { DeviceResolver } from '../resolver';
import { EntityActivityAction, EntityActivityService, EntityActivityType, LocationService, TelemetryService } from '../service';
import { SessionService } from '../session/SessionService';
import { DirectiveService } from './DirectiveService';
import { PairingResponse } from './PairingService';

const { some, none, isNone, fromNullable } = O;
type Option<T> = O.Option<T>;

@injectable()
class DeviceService {
  private locationServiceFactory: () => LocationService;
  private sessionServiceFactory: () => SessionService;

  constructor(
    @inject('DeviceResolver') private deviceResolver: DeviceResolver,
    @inject('PairingService') private apiV1PairingService: PairingService,
    @inject('Logger') private readonly logger: Logger,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('InternalDeviceService') private internalDeviceService: InternalDeviceService,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService,
    @inject('KafkaProducer') private kafkaPublisher: KafkaProducer,
    @inject('TelemetryService') private telemetrySevice: TelemetryService
  ) {
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
    this.sessionServiceFactory = depFactoryFactory<SessionService>('SessionService');
  }

  public async getDeviceById(id: string, expand?: PropExpand): Promise<Option<Device>> {
    const device: Device | null = await this.deviceResolver.get(id, expand);

    return fromNullable(device);
  }

  public async getByMacAddress(macAddress: string, expand?: PropExpand): Promise<Option<Device>> {
    const device = await this.deviceResolver.getByMacAddress(macAddress, expand);

    return fromNullable(device);
  }

  public async updatePartialDevice(id: string, deviceUpdate: DeviceUpdate, directiveService?: DirectiveService): Promise<Device> {
    const updatedDevice = await this.deviceResolver.updatePartial(id, deviceUpdate);

    if (directiveService && deviceUpdate.valve) {
      if (deviceUpdate.valve.target === ValveState.OPEN) {
        await directiveService.openValve(id);
      } else if (deviceUpdate.valve.target === ValveState.CLOSED) {
        await directiveService.closeValve(id);
      }
    }

    return updatedDevice;
  }

  public async removeDevice(id: string): Promise<void> {

    await pipe(
      await this.getDeviceById(id),
      O.fold(
        async () => {
          await this.deviceResolver.remove(id)
        },
        async device => {
          await this.deviceResolver.remove(id);
          await this.entityActivityService.publishEntityActivity(
            EntityActivityType.DEVICE,
            EntityActivityAction.DELETED,
            device
          );
        }
      )
    );
  }

  public async scanQrCode(authToken: string, userId: string, qrData: QrData): Promise<PairingResponse> {
    const pairingData = await this.apiV1PairingService.initPairing(authToken, qrData);
    const { deviceId } = pairingData;

    await this.internalDeviceService.createFirestoreStubDevice(deviceId);

    const { token } = await this.sessionServiceFactory().issueFirestoreToken(userId, { devices: [deviceId] });

    return {
      ...pairingData,
      firestore: {
        token
      }
     };
  }

  public async pairDevice(authToken: string, deviceCreate: DeviceCreate): Promise<Device> {
    const [device, location] = await Promise.all([
      this.deviceResolver.getByMacAddress(deviceCreate.macAddress),
      this.locationServiceFactory().getLocation(deviceCreate.location.id)
    ]);

    if (device !== null && !_.isEmpty(device) && !device.isPaired) {
      throw new ConflictError('Device already paired.');
    } else if (isNone(location)) {
      throw new ResourceDoesNotExistError('Location does not exist');
    }

    const createdDevice = (device !== null && !_.isEmpty(device)) ?
      device :
      await this.deviceResolver.createDevice(deviceCreate, true);

    if (deviceCreate.deviceType !== DeviceType.PUCK) {
      try {
        await this.apiV1PairingService.completePairing(authToken, createdDevice.id, {
          macAddress: createdDevice.macAddress,
          timezone: location.value.timezone
        });
      } catch (err) {
        // Failure to complete the pairing process should not cause the pairing to completely fail.
        // This is how pairing works in API v1.
        this.logger.error({ err });
      }
    }

    return createdDevice;
  }

  public async getAllByLocationId(locationId: string, expand?: PropExpand): Promise<Device[]> {
    return this.deviceResolver.getAllByLocationId(locationId, expand);
  }

  public async publishTelemetry(id: string, telemetry: any, isDevicePuck: boolean): Promise<void> {
    if (!isDevicePuck) {
      const telemetryMessages: Telemetry[] = telemetry.items;
      await pipe(
        await this.getDeviceById(id),
        O.map(async device => {
          const messages = telemetryMessages
            .map(telemetryMessage => ({
              ...telemetryMessage,
              did: device.macAddress
            }));

          await this.telemetrySevice.publishTelemetry(messages);
        }),
        O.getOrElse(async (): Promise<void> => { throw new NotFoundError(); })
      );
    } else {
      // TODO: PUCK. Telemetry structure is TBD at the time of writing this.
      await this.telemetrySevice.publishPuckTelemetry({
        ...telemetry,
        date: moment().toISOString()
      });
    }
  }

}

export { DeviceService };

