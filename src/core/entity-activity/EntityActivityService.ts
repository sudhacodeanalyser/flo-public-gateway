import { injectable, inject } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Expandable } from '../api';
import Logger from 'bunyan';

export enum EntityActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted'
}

export enum EntityActivityType {
  DEVICE = 'device',
  LOCATION = 'location',
  ACCOUNT = 'account',
  USER = 'user'
}

interface EntityActivityMessage<T> {
  date: string;
  type: EntityActivityType;
  action: EntityActivityAction;
  id: string;
  item?: Expandable<T>;
}

@injectable() 
class EntityActivityService {

  constructor(
    @inject('EntityActivityKafkaTopic') private readonly entityActivityKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
    @inject('Logger') private readonly logger: Logger
  ) {}

  public async publishEntityActivity<T>(type: EntityActivityType, action: EntityActivityAction, item: Expandable<T>): Promise<void> {
    try {
      const message = this.formatEntityActivityMessage(type, action, item);

      // tslint:disable
      console.log([this.entityActivityKafkaTopic, message])

      await this.kafkaProducer.send(this.entityActivityKafkaTopic, message);
    } catch (err) {
      this.logger.error({ err });
    }
  }

  private formatEntityActivityMessage<T>(type: EntityActivityType, action: EntityActivityAction, item: Expandable<T>): EntityActivityMessage<T> {
    return {
      date: new Date().toISOString(),
      type,
      action,
      id: item.id,
      item
    };
  }
}

export { EntityActivityService }