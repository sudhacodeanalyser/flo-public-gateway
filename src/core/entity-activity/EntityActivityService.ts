import { injectable, inject } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Expandable, Device as DeviceModel, Location as LocationModel, Account as AccountModel, User as UserModel } from '../api';
import Logger from 'bunyan';
import { Device, Account, Location, User } from '../api/response';

export enum EntityActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted'
}

export enum EntityActivityType {
  DEVICE = 'device',
  LOCATION = 'location',
  ACCOUNT = 'account',
  USER = 'user',
  SUBSCRIPTION = 'subscription'
}

interface EntityActivityMessage<T> {
  date: string;
  type: EntityActivityType;
  action: EntityActivityAction;
  id: string;
  item?: any;
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

      await this.kafkaProducer.send(this.entityActivityKafkaTopic, message);
    } catch (err) {
      this.logger.error({ err });
    }
  }

  private formatEntityActivityMessage<T>(type: EntityActivityType, action: EntityActivityAction, data: Expandable<T>): EntityActivityMessage<T> {
    const item = this.mapItem(type, data);
    
    return {
      date: new Date().toISOString(),
      type,
      action,
      id: item.id,
      item
    };
  }

  private mapItem(type: EntityActivityType, data: any): any {
    switch (type) {
      case EntityActivityType.DEVICE:
        const {
          macAddress,
          id,
          deviceModel,
          deviceType,
          nickname,
          serialNumber,
          fwVersion,
          lastHeardFromTime
        } = Device.fromModel(data as DeviceModel);

        return {
          macAddress,
          id,
          deviceModel,
          deviceType,
          nickname,
          serialNumber,
          fwVersion,
          lastHeardFromTime
        };
      case EntityActivityType.LOCATION:
        return Location.fromModel(data as LocationModel);
      case EntityActivityType.ACCOUNT:
        return Account.fromModel(data as AccountModel);
      case EntityActivityType.USER:
        return User.fromModel(data as UserModel);
      default:
        return data;
    }
  }
}

export { EntityActivityService }