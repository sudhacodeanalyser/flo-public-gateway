import { injectable, inject } from 'inversify';
import { Kafka, Partitioners, Producer } from 'kafkajs';

export interface KafkaProducerConfig {
  host: string,
  timeout?: number
}

@injectable()
class KafkaProducer {
  private isConnected: boolean = false;
  private kafkaProducer: Producer;

  constructor(
    @inject('KafkaProducerConfig') kafkaProducerConfig: KafkaProducerConfig
  ) {
    const kafka = new Kafka({
      brokers: (kafkaProducerConfig.host || '').split(','),
      requestTimeout: kafkaProducerConfig.timeout || 5000
    });

    this.kafkaProducer = kafka.producer({createPartitioner: Partitioners.DefaultPartitioner});
  }

  public async connect(): Promise<KafkaProducer> {

    if (!this.isConnected) {
      await this.kafkaProducer.connect();
      this.isConnected = true;
    }

    return this;
  }

  public async send(topic: string, message: any, key?: string): Promise<void> {

    if (topic === '') {
      throw new Error('Topic cannot be empty.');
    } else if (message === null || message === undefined) {
      throw new Error('Message cannot be null or undefined.');
    }

    const self = await this.connect();

    await self.kafkaProducer.send({
      topic,
      messages: [{
        ...(key && { key }),
        value: Buffer.from(JSON.stringify(message)),
        timestamp: `${ Date.now() }`
      }]
    });
  }
}

export { KafkaProducer };