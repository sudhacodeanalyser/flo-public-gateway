import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import moment from 'moment';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Device, DeviceType, Telemetry } from '../api';
import NotFoundError from '../api/error/NotFoundError';
import { DeviceService } from '../service';

@injectable()
class TelemetryService {

  constructor(
    @inject('TelemetryKafkaTopic') private readonly telemetryKafkaTopic: string,
    @inject('PuckTelemetryKafkaTopic') private readonly puckTelemetryKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
    @inject('DeviceService') private readonly deviceService: DeviceService
  ) {}

  public async publishTelemetry(deviceId: string, telemetry: any): Promise<void> {
    await pipe(
      await this.deviceService.getDeviceById(deviceId),
      O.map(async device => {

        if (this.isPuck(device)) {
          // TODO: PUCK. Telemetry structure is TBD at the time of writing this.
          await this.publishPuckTelemetry({
            ...telemetry.data,
            date: moment().toISOString()
          });
        } else {
          const telemetryMessages: Telemetry[] = telemetry.items;
          const messages = telemetryMessages
            .map(telemetryMessage => ({
              ...telemetryMessage,
              did: device.macAddress
            }));

          await this.publishDeviceTelemetry(messages);
        }
      }),
      O.getOrElse(async (): Promise<void> => { throw new NotFoundError(); })
    );
  }

  private async publishDeviceTelemetry(telemetryMessages: Telemetry[]): Promise<void> {
    const promises = telemetryMessages.map(telemetryMessage =>
      this.kafkaProducer.send(
        this.telemetryKafkaTopic,
        telemetryMessage
      )
    );

    await Promise.all(promises);
  }

  private async publishPuckTelemetry(telemetry: any): Promise<void> {
    return this.kafkaProducer.send(this.puckTelemetryKafkaTopic, telemetry);
  }

  private isPuck(device: Device): boolean {
    return device.deviceType === DeviceType.PUCK
  }
}

export { TelemetryService };

