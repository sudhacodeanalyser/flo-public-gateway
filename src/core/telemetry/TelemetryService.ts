import { injectable, inject } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Telemetry } from '../api';

@injectable() 
class TelemetryService {

  constructor(
    @inject('TelemetryKafkaTopic') private readonly telemetryKafkaTopic: string,
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
}

export { TelemetryService }