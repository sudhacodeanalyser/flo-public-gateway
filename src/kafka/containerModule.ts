import { ContainerModule, interfaces } from 'inversify';
import { KafkaProducer, KafkaProducerConfig } from './KafkaProducer';
import config from '../config/config';

const containerModule = new ContainerModule((bind: interfaces.Bind) => {
  bind<KafkaProducerConfig>('KafkaProducerConfig').toConstantValue({
    host: config.kafkaHost,
    timeout: Number(config.kafkaTimeout)
  });
  bind<KafkaProducer>('KafkaProducer').to(KafkaProducer).inSingletonScope();
});

export default containerModule;