import { injectable, inject } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { Expandable, Device as DeviceModel, Location as LocationModel, Account as AccountModel, User as UserModel } from '../api';
import { interfaces } from 'inversify-express-utils';
import { injectableHttpContext } from '../../cache/InjectableHttpContextUtils';
import Logger from 'bunyan';
import { Device, Account, Location, User } from '../api/response';
import { mergeObjects } from '../api/controllerUtils';

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
  ALARM_SETTINGS = 'alarm_settings',
  SUBSCRIPTION = 'subscription'
}

interface EntityActivityMessage<T> {
  date: string;
  type: EntityActivityType;
  action: EntityActivityAction;
  requestId: string | undefined;
  id: string;
  item?: any;
}

@injectable()
class EntityActivityService {

  constructor(
    @injectableHttpContext private readonly httpContext: interfaces.HttpContext,
    @inject('EntityActivityKafkaTopic') private readonly entityActivityKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
    @inject('Logger') private readonly logger: Logger
  ) {}

  public async publishEntityActivity<T>(type: EntityActivityType, action: EntityActivityAction, item: Expandable<T>, explode: boolean = false): Promise<void> {
    try {
      const message = this.formatEntityActivityMessage(type, action, item, explode);

      await this.kafkaProducer.send(this.entityActivityKafkaTopic, message);
    } catch (err) {
      this.logger.error({ err });
    }
  }

  private formatEntityActivityMessage<T>(type: EntityActivityType, action: EntityActivityAction, data: Expandable<T>, explode: boolean): EntityActivityMessage<T> {
    let item = this.mapItem(type, data);
    if (explode){
      item = mergeObjects(data, item);
    }
    const requestId = this.httpContext?.request?.get('x-request-id');

    return {
      date: new Date().toISOString(),
      type,
      action,
      requestId,
      id: item.id,
      item
    };
  }

  private mapItem(type: EntityActivityType, data: any): any {
    switch (type) {
      case EntityActivityType.DEVICE:
        const {
          macAddress,
          id: deviceId,
          deviceModel,
          deviceType,
          nickname: deviceNickname,
          serialNumber,
          fwVersion,
          lastHeardFromTime,
          location
        } = Device.fromModel(data as DeviceModel);
        const {
          id: deviceLocationId,
          account: deviceLocationAccount
        } = location || {};

        return {
          macAddress,
          id: deviceId,
          deviceModel,
          deviceType,
          nickname: deviceNickname,
          serialNumber,
          fwVersion,
          lastHeardFromTime,
          location: location && {
            id: deviceLocationId,
            account: deviceLocationAccount
          }
        };
      case EntityActivityType.LOCATION:
        const {
          id: locationId,
          account: locationAccount,
          address,
          address2,
          city,
          state,
          postalCode,
          country,
          ['class']: locationClass,
          nickname: locationNickname
        } = Location.fromModel(data as LocationModel);
        const {
          id: locationAccountId,
        } = locationAccount || {};

        return {
          id: locationId,
          address,
          address2,
          city,
          state,
          postalCode,
          country,
          ['class']: locationClass,
          nickname: locationNickname,
          account: locationAccount && {
            id: locationAccountId
          }
        };
      case EntityActivityType.ACCOUNT:
        return Account.fromModel(data as AccountModel);
      case EntityActivityType.USER:
        const {
          id: userId,
          firstName,
          lastName,
          prefixName,
          email,
          phoneMobile,
          locale,
          account: userAccount,
        } = User.fromModel(data as UserModel);
        const {
          id: userAccountId
        } = userAccount || {};

        return {
          id: userId,
          firstName,
          lastName,
          prefixName,
          email,
          phoneMobile,
          locale,
          account: userAccount && { id: userAccountId }
        };
      default:
        return data;
    }
  }

}

export { EntityActivityService }
