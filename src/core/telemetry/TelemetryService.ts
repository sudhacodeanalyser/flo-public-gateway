import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import moment from 'moment';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Device, DeviceTelemetry, DeviceTelemetryData, DeviceType, PuckTelemetry, Telemetry } from '../api';
import NotFoundError from '../api/error/NotFoundError';
import ValidationError from '../api/error/ValidationError';
import { DeviceService } from '../service';

@injectable()
class TelemetryService {

  constructor(
    @inject('TelemetryKafkaTopic') private readonly telemetryKafkaTopic: string,
    @inject('PuckTelemetryKafkaTopic') private readonly puckTelemetryKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
    @inject('DeviceService') private readonly deviceService: DeviceService,
  ) {}

  public async publishTelemetry(telemetry: Telemetry): Promise<void> {
    await pipe(
      await this.deviceService.getDeviceById(telemetry.deviceId),
      O.map(async device => {

        if (this.isPuck(device) && this.isPuckTelemetry(telemetry)) {
          await this.publishPuckTelemetry({
            ...telemetry.data,
            date: moment().toISOString()
          });
        } else if (this.isDeviceTelemetry(telemetry)) {
          const telemetryMessages: DeviceTelemetryData[] = telemetry.items;
          const messages = telemetryMessages
            .map(telemetryMessage => ({
              ...telemetryMessage,
              did: device.macAddress
            }));

          await this.publishDeviceTelemetry(messages);
        } else {
          throw new ValidationError('Telemetry does ont match device type.');
        }
      }),
      O.getOrElse(async (): Promise<void> => { throw new NotFoundError(); })
    );
  }

  private async publishDeviceTelemetry(telemetryMessages: DeviceTelemetryData[]): Promise<void> {
    const promises = telemetryMessages.map(telemetryMessage =>
      this.kafkaProducer.send(
        this.telemetryKafkaTopic,
        telemetryMessage,
        telemetryMessage.did
      )
    );

    await Promise.all(promises);
  }

  private async publishPuckTelemetry(telemetry: any): Promise<void> {
    return this.kafkaProducer.send(this.puckTelemetryKafkaTopic, telemetry, telemetry.device_id);
  }

  private isPuck(device: Device): boolean {
    return device.deviceType === DeviceType.PUCK
  }

  private isPuckTelemetry(telemetry: Telemetry): telemetry is PuckTelemetry {
    return _.isString(telemetry.deviceId) && _.isPlainObject((telemetry as PuckTelemetry).data);
  }

  private isDeviceTelemetry(telemetry: Telemetry): telemetry is DeviceTelemetry {
    return _.isString(telemetry.deviceId) && _.isArray((telemetry as DeviceTelemetry).items);
  }
}

export { TelemetryService };
