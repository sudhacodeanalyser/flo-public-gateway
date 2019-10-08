import { inject, injectable } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Telemetry } from '../api';

@injectable()
class TelemetryService {

  constructor(
    @inject('TelemetryKafkaTopic') private readonly telemetryKafkaTopic: string,
    @inject('PuckTelemetryKafkaTopic') private readonly puckTelemetryKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
  ) {}

  public async publishTelemetry(telemetryMessages: Telemetry[]): Promise<void> {
    const promises = telemetryMessages.map(telemetryMessage =>
      this.kafkaProducer.send(
        this.telemetryKafkaTopic,
        telemetryMessage
      )
    );

    await Promise.all(promises);
  }

  public async publishPuckTelemetry(telemetry: any): Promise<void> {
    return this.kafkaProducer.send(this.puckTelemetryKafkaTopic, telemetry);
  }
}

export { TelemetryService };

