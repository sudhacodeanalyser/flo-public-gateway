import { injectable, inject } from 'inversify';
import Kafka from 'node-rdkafka';

export interface KafkaProducerConfig {
  host: string,
  timeout?: number
}

@injectable()
class KafkaProducer {
  private kafkaProducer: Kafka.Producer;

  constructor(
    @inject('KafkaProducerConfig') kafkaProducerConfig: KafkaProducerConfig
  ) {
    this.kafkaProducer = new Kafka.Producer({
      'metadata.broker.list': kafkaProducerConfig.host,
      'request.timeout.ms': kafkaProducerConfig.timeout || 5000
    }, undefined);
  }

  public async connect(): Promise<KafkaProducer> {

    if (this.kafkaProducer.isConnected()) {
     return this;
    }

    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.kafkaProducer.removeListener('event.error', onError);
        resolve(this);
      };
      const onError = (err: any) => {
        this.kafkaProducer.removeListener('ready', onReady);
        reject(err);
      };
      
      this.kafkaProducer.connect();
      this.kafkaProducer.once('ready', onReady);
      this.kafkaProducer.once('event.error', onError);
    });
  }

  public async send(topic: string, message: any): Promise<void> {

    if (topic === '') {
      throw new Error('Topic cannot be empty.');
    } else if (message === null || message === undefined) {
      throw new Error('Message cannot be null or undefined.');
    }

    const self = await this.connect();

    self.kafkaProducer.produce(topic, null, new Buffer(JSON.stringify(message)), undefined, Date.now());
  }
}

export { KafkaProducer };