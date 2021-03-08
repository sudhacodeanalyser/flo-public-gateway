import { injectable, inject } from 'inversify';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import {
  Expandable,
  Device as DeviceModel,
  Location as LocationModel,
  DependencyFactoryFactory,
} from '../api';
import Logger from 'bunyan';
import { UserService } from '../service';
import { Device, Location} from '../api/response';
import {
  ItemEvent,
  ResourceEventAction,
  ResourceEventInfo,
  ResourceEventMessage,
  ResourceEventType,
} from '../api/model/ResourceEvent';
import { isNone } from 'fp-ts/lib/Option';

@injectable()
class ResourceEventService {
  private userServiceFactory: () => UserService;

  constructor(
    @inject('ResourceEventKafkaTopic')
    private readonly resourceEventKafkaTopic: string,
    @inject('KafkaProducer') private readonly kafkaProducer: KafkaProducer,
    @inject('Logger') private readonly logger: Logger,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
  ) {
    this.userServiceFactory = depFactoryFactory('UserService');
  }

  public async publishResourceEvent<T>(
    type: ResourceEventType,
    action: ResourceEventAction,
    item: Expandable<T>,
    resourceEventInfo: ResourceEventInfo
  ): Promise<void> {
    try {

      const user = await this.userServiceFactory().getUserById(resourceEventInfo.userId, {
        $select: {
          email: true,
          account: { $select: { id: true } }
        }
      });

      let accountId = ''
      let userName = ''

      if (!isNone(user)) {
        userName = user.value.email || ''
        accountId = user.value.account.id
      }

      const message = this.formatResourceEventMessage(
        type,
        action,
        item,
        resourceEventInfo,
        accountId,
        userName
      );

      await this.kafkaProducer.send(this.resourceEventKafkaTopic, message);
    } catch (err) {
      this.logger.error({ err });
    }
  }

  private formatResourceEventMessage<T>(
    type: ResourceEventType,
    action: ResourceEventAction,
    itemData: Expandable<T>,
    resourceEventInfo: ResourceEventInfo,
    accountId: string,
    userName: string,
  ): ResourceEventMessage {
    const item = this.mapItem(type, itemData, resourceEventInfo.eventData);

    return {
      created: new Date().toISOString(),
      accountId,
      resourceType: type,
      resourceAction: action,
      resourceName: item.resourceName,
      resourceId: item.resourceId,
      userId: resourceEventInfo.userId,
      userName,
      ipAddress: resourceEventInfo.ipAddress,
      clientId: resourceEventInfo.clientId,
      userAgent: resourceEventInfo.userAgent,
      eventData: item.eventData,
    };
  }

  private mapItem(type: ResourceEventType, itemData: any, eventData: any): ItemEvent {
    switch (type) {
      case ResourceEventType.DEVICE:
        const { id: deviceId, nickname: deviceNickname } = Device.fromModel(
          itemData as DeviceModel
        );

        return {
          resourceId: deviceId,
          resourceName: deviceNickname || '',
          eventData: eventData || {},
        };
      case ResourceEventType.LOCATION:
        const {
          id: locationId,
          nickname: locationNickname,
        } = Location.fromModel(itemData as LocationModel);

        return {
          resourceId: locationId,
          resourceName: locationNickname || '',
          eventData: eventData || {},
        };
      default:
        return {
          resourceId: '',
          resourceName: '',
          eventData: {},
        };
    }
  }
}

export { ResourceEventService };
