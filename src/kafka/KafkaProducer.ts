import { injectable, inject } from 'inversify';
import { Kafka, Producer } from 'kafkajs';

export interface KafkaProducerConfig {
  host: string,
  timeout?: number
}

@injectable()
class KafkaProducer {
  private kafkaProducer: Producer;

  constructor(
    @inject('KafkaProducerConfig') kafkaProducerConfig: KafkaProducerConfig
  ) {
    const kafka = new Kafka({
      brokers: kafkaProducerConfig.host.split(','),
      requestTimeout: kafkaProducerConfig.timeout || 5000
    });

    this.kafkaProducer = kafka.producer();
  }

  public async connect(): Promise<KafkaProducer> {
    await this.kafkaProducer.connect();

    return this;
  }

  public async send(topic: string, message: any): Promise<void> {

    if (topic === '') {
      throw new Error('Topic cannot be empty.');
    } else if (message === null || message === undefined) {
      throw new Error('Message cannot be null or undefined.');
    }

    const self = await this.connect();

    await self.kafkaProducer.send({
      topic,
      acks: 1,
      messages: [{
        value: Buffer.from(JSON.stringify(message)),
        timestamp: `${ Date.now() }`
      }]
    });
  }
}

export { KafkaProducer };